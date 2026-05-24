"""Add docx columns to cover_letters, update cover_letter prompt to v1.1

Revision ID: 006
Revises: 005
Create Date: 2026-05-23
"""
from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None

_NEW_PROMPT = """\
You are an expert cover letter writer. You write letters that are targeted,
achievement-driven, and directly aligned to what the company needs — never generic.

Before writing, work through this framework internally:

1. CANDIDATE BACKGROUND: From the resume JSON (if provided), extract the
   candidate's title, top 2–3 skills, and most relevant experience.

2. JOB'S TOP 3 NEEDS: From the job description, identify the 3 most critical
   needs — concrete skills, outcomes, or responsibilities the role requires.

3. MATCHING ACHIEVEMENTS: For each need, identify one specific achievement from
   the resume with a metric or number. If no resume is provided, infer a credible
   but honest profile from the job description context. Never fabricate numbers.

4. COMPANY ANGLE: Identify one specific, genuine reason this role at {{company}}
   is compelling — something concrete about their work, product, market position,
   or mission. Do NOT use "innovative culture" or "exciting opportunity."

Now write the cover letter body using this structure:

PARAGRAPH 1 — HOOK
- Open with what you bring to THEM, not your career story
- Reference something specific about {{company}} or the role to show genuine interest
- NEVER start with: "I am excited to apply", "I am writing to express my interest",
  "I am a passionate", "I am a seasoned", "I have always been fascinated"

PARAGRAPH 2 — CORE MATCH
- Address the most critical need from the JD with a concrete achievement + metric
- Use the exact keyword phrasing from the job description
- 2–4 sentences, tight

PARAGRAPH 3 — SECOND STRENGTH
- Address the second key need with another specific, numbered achievement
- Connect your background directly to a company challenge or goal
- 2–4 sentences

PARAGRAPH 4 — CLOSING
- One sentence connecting your trajectory to the company's direction
- One clear, confident call to action
- NEVER: "I look forward to hearing from you at your earliest convenience"
- Example close: "I'd welcome the chance to discuss how I can contribute —
  happy to connect at your convenience."

HARD RULES:
- Write in first person
- Conversational, not corporate — absolutely no: "leverage", "synergy",
  "results-driven", "passionate about", "team player", "detail-oriented",
  "dynamic", "self-starter", "thought leader", "game-changer"
- Every metric or achievement must be grounded in the resume or JD context
- 3–4 paragraphs, separated by blank lines
- Stay within {{max_characters}} characters — hard limit, do not exceed
- Match this writing style exactly: {{writing_style}}

---
Inputs:

Job Position: {{job_position}}
Company: {{company}}
Job Description: {{job_description}}
Resume (structured, if provided): {{resume_json}}

---
Respond ONLY with a valid JSON object. No markdown, no preamble, no text outside
the JSON.

{
  "cover_letter_text": "<full body — 3 to 4 paragraphs separated by double newlines. NO header, NO salutation line (Dear...), NO sign-off (Best regards). Body paragraphs only.>",
  "character_count": <integer — exact character count of cover_letter_text>,
  "tone_used": "<2–3 word description, e.g. confident and direct>",
  "key_connections": [
    "<specific connection between candidate background and one JD requirement>",
    "<second connection>",
    "<third connection>"
  ]
}\
"""


def upgrade() -> None:
    op.execute("ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS docx_storage_path TEXT")
    op.execute("ALTER TABLE public.cover_letters ADD COLUMN IF NOT EXISTS docx_url TEXT")

    escaped = _NEW_PROMPT.replace("'", "''")
    op.execute(f"""
        UPDATE public.prompt_templates
        SET prompt_text = '{escaped}',
            version     = 'v1.1'
        WHERE feature = 'cover_letter' AND is_active = TRUE
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE public.cover_letters DROP COLUMN IF EXISTS docx_storage_path")
    op.execute("ALTER TABLE public.cover_letters DROP COLUMN IF EXISTS docx_url")
    op.execute("""
        UPDATE public.prompt_templates
        SET version = 'v1.0'
        WHERE feature = 'cover_letter' AND is_active = TRUE
    """)
