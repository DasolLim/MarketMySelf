# AI Resume Builder — Claude Code Implementation Plan

Rezi-style resume builder: ATS keyword targeting, real-time content analysis, and a 23-point Resume Score (1–100). Built for a Next.js 14 (App Router) + TypeScript fullstack project.

## Stack assumptions
- Next.js 14 App Router, TypeScript
- Drizzle ORM + Postgres (Supabase or RDS)
- Auth.js v5
- OpenRouter as the LLM gateway

```dotenv
OPENROUTER_FRONTIER_MODEL=google/gemini-3-flash-preview
OPENROUTER_CHEAP_MODEL=openai/gpt-4o-mini
```

**Model allocation (adjust as you see fit):**
- `CHEAP_MODEL` → JD keyword extraction/classification (high volume, low ambiguity)
- `FRONTIER_MODEL` → Tier 2 content analysis + 23-point scoring (needs semantic judgment)

Run these phases in order. Each is a self-contained prompt — paste one at a time into Claude Code, verify, then move to the next. Don't run Phase N+1 until Phase N is working.

---

## Phase 0 — Shared types & OpenRouter client

**Claude Code Prompt:**

```
Set up shared infrastructure for a new "Resume Builder" feature before any UI or routes exist.

1. Create lib/openrouter.ts:
   - Export an async function `callOpenRouter(params: { model: 'frontier' | 'cheap'; system: string; user: string; jsonMode?: boolean })`
   - Resolves 'frontier' -> process.env.OPENROUTER_FRONTIER_MODEL, 'cheap' -> process.env.OPENROUTER_CHEAP_MODEL
   - Calls https://openrouter.ai/api/v1/chat/completions with Authorization: Bearer ${OPENROUTER_API_KEY}
   - If jsonMode is true, append "Respond only with valid JSON. No markdown, no preamble." to the system prompt and set response_format: { type: "json_object" } if the model supports it
   - Throws a typed error on non-2xx responses, includes basic retry (1 retry) on 429/503
   - Returns the parsed content string

2. Create types/resume-builder.ts with these interfaces (do not implement logic yet, just types):
   - ResumeDocument { id, userId, title, contentJson: ResumeContent, createdAt, updatedAt }
   - ResumeContent { sections: ResumeSection[] } where ResumeSection has { id, type: 'summary'|'experience'|'education'|'skills'|'projects'|'custom', title, bullets: ResumeBullet[] }
   - ResumeBullet { id, text, sectionId }
   - Tier1Flag { bulletId, rule: string, severity: 'high'|'medium'|'low', message: string }
   - KeywordMatch { keyword: string, category: 'hard_skill'|'soft_skill'|'tool'|'qualification', weight: number, status: 'matched'|'buried'|'missing', suggestedLocation?: string }
   - ScoreBreakdown { criterion: string, category: string, points: number, maxPoints: number, note: string }
   - ResumeScore { overallScore: number, breakdown: ScoreBreakdown[], generatedAt: string }

Do not create database schema or API routes yet — that's the next phase. Just get lib/openrouter.ts and types/resume-builder.ts compiling cleanly.
```

---

## Phase 1 — Database schema, document CRUD, editor shell

**Claude Code Prompt:**

```
Implement document storage and a basic editor for the Resume Builder feature. Use the types already defined in types/resume-builder.ts.

1. Add to the Drizzle schema (db/schema.ts or wherever the existing schema lives — inspect the repo first, don't create a second schema file):

resumeBuilderDocuments:
  id (uuid, pk, default random)
  userId (uuid, fk -> users.id, not null)
  title (text, not null, default 'Untitled Resume')
  contentJson (jsonb, not null)
  createdAt (timestamp, default now)
  updatedAt (timestamp, default now)

resumeBuilderVersions:
  id (uuid, pk)
  documentId (uuid, fk -> resumeBuilderDocuments.id, cascade delete)
  contentJson (jsonb, not null)
  overallScore (integer, nullable)
  createdAt (timestamp, default now)

jdKeywordExtractions:
  id (uuid, pk)
  documentId (uuid, fk -> resumeBuilderDocuments.id, cascade delete)
  jobPosition (text)
  company (text)
  jdText (text, not null)
  keywordsJson (jsonb, not null)
  createdAt (timestamp, default now)

resumeScores:
  id (uuid, pk)
  documentId (uuid, fk -> resumeBuilderDocuments.id, cascade delete)
  versionId (uuid, fk -> resumeBuilderVersions.id, nullable)
  overallScore (integer, not null)
  breakdownJson (jsonb, not null)
  createdAt (timestamp, default now)

Generate and note the migration but do not auto-apply it — I'll run it myself.

2. Create route handlers under app/api/builder/documents:
   - POST /api/builder/documents — create a document, auth-scoped to the logged-in user (use existing Auth.js session pattern in the repo)
   - GET /api/builder/documents — list current user's documents
   - GET /api/builder/documents/[id] — fetch one, 404 if not owned by requester
   - PATCH /api/builder/documents/[id] — update title/contentJson, also insert a row into resumeBuilderVersions with the new contentJson (keep last 20 versions per document, prune older ones)
   - DELETE /api/builder/documents/[id]

3. Create app/builder/[id]/page.tsx — a two-pane layout:
   - Left pane: section-by-section editor. Each section renders its bullets as editable text areas. Add/remove bullet buttons. Add/remove section buttons.
   - Right pane: empty tabbed shell for now with three tabs — "Score", "Keywords", "Issues" — each showing a placeholder "Coming in phase 3/4/5" state. Do NOT implement their logic yet.
   - Autosave: debounce 1.5s after last edit, PATCH the document, show a small "Saved" indicator.

Follow the existing component/styling conventions in the repo — inspect a couple of existing pages first and match patterns rather than introducing new ones.
```

---

## Phase 2 — Tier 1 rule engine (instant, client-side, no LLM)

**Claude Code Prompt:**

```
Implement the Tier 1 rule engine for real-time resume feedback. This must run entirely client-side with zero network calls — it's the "instant" feedback layer, LLM checks come in a later phase.

Create lib/resume-builder/rule-engine.ts exporting `runTier1Checks(content: ResumeContent): Tier1Flag[]`.

Implement these rules, each producing a Tier1Flag when triggered:

1. weak_opener — bullet starts with "Responsible for", "Worked on", "Helped with", "Assisted with", "Duties included", or a personal pronoun ("I ", "My "). severity: medium
2. buzzword — bullet contains any of: "results-driven", "team player", "hard worker", "detail-oriented", "go-getter", "think outside the box", "synergy", "self-starter". severity: low
3. missing_quantification — bullet has no digit and no % or $ character. severity: medium
4. passive_voice — bullet matches /\b(was|were|is|are|been)\s+\w+ed\b/i. severity: low
5. bullet_too_long — bullet text exceeds 220 characters. severity: low
6. bullet_too_short — bullet text under 40 characters (likely a fragment, not a full accomplishment). severity: low
7. duplicate_opening_verb — two or more bullets in the same section start with the identical first word. severity: medium
8. missing_section — required sections (summary, experience, education, skills) absent from content.sections. severity: high
9. incomplete_contact — if a 'contact' or 'header' section exists, flag if it's missing email or phone pattern matches. severity: high

Each check should be a small pure function so they're independently testable. Export them individually AND combined via runTier1Checks.

Wire this into app/builder/[id]/page.tsx's editor: run runTier1Checks on a 250ms debounce as the user types, populate the "Issues" tab with the results grouped by severity (high first), and underline/highlight the affected bullet inline in the left pane (red for high, amber for medium, gray for low — check existing repo for a color token convention first).

Write a small test file (rule-engine.test.ts) covering each rule with one triggering and one non-triggering example.
```

---

## Phase 3 — JD keyword extraction

**Claude Code Prompt:**

```
Implement job-description keyword extraction and matching against the resume.

1. Create lib/resume-builder/keyword-extraction.ts exporting `extractKeywords(jobPosition: string, company: string, jdText: string): Promise<KeywordMatch[]>` (without the status field yet — that's computed in step 2).

   Use callOpenRouter({ model: 'cheap', jsonMode: true, ... }) with this system prompt:

   "You extract the most important keywords from a job description for resume-matching purposes. Extract 15-20 keywords or short phrases. Classify each as hard_skill, soft_skill, tool, or qualification. Weight each 1-5 based on how central it is to the role (5 = explicitly required, mentioned multiple times or in title; 1 = mentioned once, minor). Respond only with a JSON array of {keyword, category, weight}. No explanation."

   User message includes job position, company, and the JD text.

2. Create lib/resume-builder/keyword-match.ts exporting `matchKeywords(keywords: KeywordMatch[], content: ResumeContent): KeywordMatch[]`.
   - For each keyword, do a case-insensitive substring/stem check against all bullet text and the skills section specifically.
   - status = 'matched' if present in the skills section OR in 2+ bullets; 'buried' if present in exactly 1 bullet but not the skills section; 'missing' otherwise.
   - For 'missing' keywords with weight >= 3, set suggestedLocation to the section name of the experience section whose existing bullets are semantically closest (simple heuristic: whichever experience section has the most other matched keywords — no LLM call needed here, keep it fast).

3. Add POST /api/builder/documents/[id]/keywords route:
   - Body: { jobPosition, company, jdText }
   - Calls extractKeywords, then matchKeywords against the document's current contentJson
   - Persists to jdKeywordExtractions
   - Returns the matched KeywordMatch[]

4. Wire the "Keywords" tab in app/builder/[id]/page.tsx:
   - A form (job position, company, JD textarea) that POSTs to the new route
   - Results list grouped by status (missing high-weight first), color-coded, each item shows category badge and, for missing items, the suggestedLocation
   - Clicking a missing keyword scrolls/highlights the suggested section in the left pane (don't auto-insert text — just point the user there)
```

---

## Phase 4 — LLM scoring engine (23-criteria Resume Score)

**Claude Code Prompt:**

```
Implement the full Resume Score: a weighted 23-criteria evaluation combining Tier 1 rule results with LLM judgment calls, normalized to 0-100.

1. Create lib/resume-builder/scoring.ts exporting `computeScore(content: ResumeContent, tier1Flags: Tier1Flag[], keywordMatches: KeywordMatch[] | null): Promise<ResumeScore>`.

The 23 criteria, grouped by category with point weights (must sum to 100):

FORMATTING_ATS (24 pts total, all rule-based, no LLM):
- parseable_format (4) — no tables/columns detected in structure
- standard_section_headers (4) — sections use conventional names
- consistent_date_format (4) — derived from Tier1 checks
- contact_info_complete (4)
- bullet_point_usage (4) — every experience section uses bullets, not paragraphs
- length_appropriate (4) — total content maps to roughly 1-2 pages worth of bullets (heuristic: bullet count x avg length)

CONTENT_QUALITY (28 pts total, rule-based from Tier1 + one LLM pass):
- action_verb_strength (4) — inverse of weak_opener flags
- no_buzzwords (4) — inverse of buzzword flags
- no_passive_voice (4) — inverse of passive_voice flags
- no_duplicate_verbs (4) — inverse of duplicate_opening_verb flags
- bullet_length_appropriate (4) — inverse of too_long/too_short flags
- grammar_spelling (4, LLM) — LLM flags actual errors
- outcome_vs_task_framing (4, LLM) — LLM judges whether bullets show results, not just duties

IMPACT_QUANTIFICATION (23 pts total, mostly rule + one LLM pass):
- quantification_rate (7) — % of bullets with a number/%/$, scaled
- scope_indicators (4, LLM) — team size, budget, scale mentioned where relevant
- top_loaded_bullets (4, LLM) — strongest bullet leads each section
- metric_credibility (4, LLM) — quantified claims read as plausible, not inflated
- outcome_specificity (4, LLM) — vague ("improved performance") vs specific ("improved performance") 

JD_KEYWORD_MATCH (25 pts total, rule-based, skip/redistribute proportionally if no JD provided):
- hard_skill_coverage (10) — % of weight-4/5 hard_skill keywords matched
- keyword_placement (5) — matched keywords appear in skills section AND body, not just one
- qualification_match (5) — required qualifications present
- title_seniority_alignment (5, LLM)

For the LLM-scored criteria, batch them into ONE callOpenRouter({ model: 'frontier', jsonMode: true }) call — do not make 8 separate calls. System prompt should instruct the model to return a JSON array of {criterion, points, maxPoints, note} for exactly the LLM-scored criteria listed above, given the resume content as input.

Combine LLM results with the rule-based results into the full 23-item breakdown, sum points, and set overallScore = sum (already scaled to 100 by the weights above).

2. Add POST /api/builder/documents/[id]/score route:
   - Runs Tier1 checks server-side (reuse Phase 2's pure functions — extract them so they're importable from both client and server), pulls the latest keyword match if one exists, calls computeScore
   - Persists to resumeScores linked to the current version
   - Returns ResumeScore

3. Wire the "Score" tab:
   - Big gauge/number for overallScore (0-100)
   - Grouped checklist by category showing each criterion, points/maxPoints, and note
   - "Rescore" button that re-runs the full pipeline (debounce so it can't be spammed — disable for 5s after each run)
```

---

## Phase 5 — Tier 2 real-time content analysis + final wiring

**Claude Code Prompt:**

```
Add the Tier 2 (LLM, debounced) content analysis layer that sits between Tier 1's instant rule checks and the full Phase 4 score — this gives the "real time content analysis" feel Rezi has without an LLM call on every keystroke.

1. Create lib/resume-builder/tier2-analysis.ts exporting `runTier2Analysis(content: ResumeContent): Promise<Tier1Flag[]>` (reuses the Tier1Flag shape — Tier 2 flags just have a `source: 'llm'` field added; extend the type).

   Single callOpenRouter({ model: 'frontier', jsonMode: true }) call per run. System prompt: "Review these resume bullets for issues Tier 1 rule-checks can't catch: bullets that state a duty without showing impact, tone/seniority mismatches for the stated role, and redundant bullets that repeat another bullet's point. Return a JSON array of {bulletId, severity, message}. Be selective — only flag genuine issues, not style preferences."

2. Add POST /api/builder/documents/[id]/analyze route wrapping runTier2Analysis.

3. In app/builder/[id]/page.tsx, wire a 2.5s "pause" debounce (separate from the 250ms Tier 1 debounce and the 1.5s autosave debounce — these three timers are independent) that calls the analyze route after the user stops typing, and merges results into the Issues tab alongside Tier 1 flags (visually distinguish LLM-sourced flags, e.g. a small "AI" badge, since they're judgment calls rather than deterministic rules).

4. Final integration check — do a full audit pass over app/builder/[id]/page.tsx:
   - Confirm all three debounce timers (Tier1 250ms, Tier2 2.5s, autosave 1.5s) don't fight each other or trigger redundant renders
   - Confirm the Score tab's "Rescore" pulls the latest keyword match automatically if one exists rather than requiring the user to re-run keyword extraction
   - Confirm loading states exist for all three async operations (keywords, score, Tier 2 analyze) and none of them block the editor from being typed in
   - Do NOT refactor unrelated code in this file — audit and extend only.
```

---

## Notes
- Phases 2 and 3 have no dependency on each other and could be built in parallel if you're running two Claude Code sessions.
- Phase 4's LLM-scored criteria intentionally batch into one call — resist the temptation to let Claude Code split them into per-criterion calls, that's where cost/latency creeps in.
- If you later want per-user customization (e.g. weighting JD match higher for career-changers), the weight table in Phase 4 is the single place to change — keep it as a constant, not hardcoded inline.
