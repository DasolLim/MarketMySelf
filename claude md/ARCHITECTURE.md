# PixelHire — Architecture

> Talent billboard platform. Professionals purchase pixel sections to be discovered by companies.
> Recruiters search and filter talent; job seekers manage profiles, applications, and subscriptions.
> A separate job scraper pipeline aggregates live listings from public sources for the public Find Work board.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                           │
│              Next.js 14 App Router · TypeScript · React 18          │
│                                                                     │
│  Public              Job Seeker             Recruiter               │
│  Home · About        Dashboard · Profile    Recruiter Hub ·         │
│  Pricing · Find Work Settings · Coaching    Search · Hire Talent    │
│  Contact             Applications                                   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ REST (JSON) · Bearer JWT
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend                             │
│          Python 3.14 · SQLAlchemy 2 · Pydantic v2 · SlowAPI        │
│                                                                     │
│  Auth · Profile · Sections · Payments · Subscriptions              │
│  Jobs · ScrapedJobs · Applications · Search · AI Coaching          │
└──────────┬─────────────────────────────┬────────────────────────────┘
           │ SQL (psycopg2)              │ SDK calls
           ▼                            ▼
┌──────────────────────┐   ┌────────────────────────────────────────┐
│  Supabase PostgreSQL │   │          Supabase Services             │
│  auth.users          │   │  Auth · Storage (profiles bucket)      │
│  public.users        │   └────────────────────────────────────────┘
│  public.pixel_       │
│    sections          │   ┌────────────────────────────────────────┐
│  public.payments     │   │              Stripe                    │
│  public.pixel_views  │   │  PaymentIntent · Webhooks ·            │
│  public.applications │   │  Subscription Checkout                 │
│  public.job_posts    │   └────────────────────────────────────────┘
│  public.subscriptions│
│  public.scraped_jobs │   ┌────────────────────────────────────────┐
│  public.coaching_    │   │         Background Workers             │
│    sessions          │   │  Notifications · Email · AI pipeline   │
│  public.notifications│   └────────────────────────────────────────┘
└──────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      Job Scraper Pipeline                           │
│                   job_scraper/ · Python 3.14                        │
│                                                                     │
│  CLI (raw → normalize → es)  ·  Scheduler (continuous)             │
│  Raw Sources: Adzuna · Dice · HN Hiring · Himalayas · Jobicy       │
│               JSearch · RemoteOK · Remotive · SerpAPI + more       │
│  Output: public.scraped_jobs (PostgreSQL) + Elasticsearch index     │
└──────────────────────────────────────────────────┬──────────────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │  Elasticsearch  │
                                          │  (jobs index)   │
                                          └─────────────────┘
```

---

## Repository Layout

```
MarketMySelf/
├── CLAUDE.md               Project conventions and design system
├── ARCHITECTURE.md         This file
├── job_scraper/            Standalone job scraping pipeline
│   ├── cli.py              Entry point: raw / normalize / es subcommands
│   ├── config.py           Pydantic Settings (env vars)
│   └── scraper/
│       ├── models.py       ScrapedJob dataclass
│       ├── runner.py       Orchestrates raw → normalize → upsert
│       ├── normalizer.py   Field normalization utilities
│       ├── deduplicator.py Content-hash + fuzzy dedup
│       ├── storage.py      asyncpg CRUD for scraped_jobs table
│       ├── scheduler.py    Continuous scrape loop
│       ├── es_client.py    AsyncElasticsearch singleton
│       ├── es_index.py     Index mapping + create/delete helpers
│       ├── es_indexer.py   index_job / index_batch / full_reindex
│       ├── es_search.py    ESJobSearchParams · es_search_jobs · es_get_job
│       ├── adapters/       Playwright-based scrapers (LinkedIn, Glassdoor, etc.)
│       └── raw/
│           ├── runner.py   Fans out to all raw sources
│           ├── storage.py  raw_jobs table CRUD
│           └── sources/    API / JSON sources (Adzuna, Dice, Himalayas, …)
└── pixelhire/
    ├── backend/            FastAPI application
    └── frontend/           Next.js application
```

---

## User Roles & Access

| Role | Entry | Key Capabilities |
|------|-------|-----------------|
| **Guest** | Home · About · Pricing · Find Work · Contact | Browse public job listings, view pricing |
| **Job Seeker** | Login/Register → Dashboard | Manage profile, browse jobs, track applications, AI coaching, subscription management |
| **Recruiter** | Login/Register → Recruiter Hub | Browse talent by category, search + filter seekers, create job posts, notify users |

Role is stored on `public.users.role` (`'seeker'`, `'recruiter'`, `'admin'`). The API gateway enforces role guards on every protected route before any service is reached.

---

## Backend (`pixelhire/backend/`)

### Layer Diagram

```
HTTP Request
    │
    ▼
main.py               CORS · lifespan · rate-limit error handler
    │
    ▼
middleware/
  rate_limit.py       SlowAPI limiter keyed by remote IP
  role_guard.py       Role-based access (seeker | recruiter | admin)
    │
    ▼
routers/              One module per resource
  auth.py             /auth/*
  profile.py          /profile/*       (seeker profile management)
  sections.py         /sections/*      (read + update pixel sections)
  images.py           /sections/{id}/image  (upload)
  payments.py         /payments/*
  subscriptions.py    /subscriptions/* (tiers + Stripe billing)
  jobs.py             /jobs/*          (recruiter job posts)
  scraped_jobs.py     /scraped-jobs/*  (public job board — read-only)
  applications.py     /applications/*  (status + notifications)
  search.py           /search/*        (talent search + filters)
  ai_coaching.py      /coaching/*      (AI feedback pipeline)
    │
    ├── schemas/       Pydantic v2 request/response models
    │   section.py
    │   payment.py
    │   profile.py
    │   job.py
    │   application.py
    │   subscription.py
    │   scraped_job.py
    │   search.py
    │   resume_analysis.py
    │
    ├── models/        SQLAlchemy 2 ORM models
    │   base.py
    │   user.py
    │   section.py
    │   payment.py
    │   job_post.py
    │   application.py
    │   subscription.py
    │   scraped_job.py
    │   coaching_session.py
    │   notification.py
    │   resume_analysis.py
    │   prompt_template.py
    │
    ├── services/      Stateless business logic
    │   stripe_service.py        PaymentIntent creation + webhook verification
    │   storage.py               Supabase Storage upload/delete (singleton client)
    │   image_processor.py       Pillow: validate MIME, resize, convert → WebP
    │   notification_service.py  Email dispatch + in-app notification writes
    │   search_service.py        Filter + rank talent queries
    │   job_search_service.py    Recruiter job post queries
    │   scraped_job_service.py   Faceted search over public.scraped_jobs
    │   ai_coaching_service.py   AI feedback pipeline (resume text, interview prep)
    │   ai_resume_service.py     AI resume file analysis pipeline (PDF/DOCX → OpenRouter)
    │   subscription_service.py  Tier management + Stripe billing
    │
    └── database.py    SQLAlchemy engine + session factory (pool_size=10)
```

### Entry Point (`main.py`)

| Concern | Implementation |
|---------|---------------|
| CORS | `allow_origins` — FRONTEND_URL + localhost:3001/3002 dev variants |
| Allowed methods | `GET POST PATCH DELETE` |
| Rate limiting | SlowAPI · per-route `@limiter.limit(...)` |
| Role guards | `role_guard.py` middleware — validates `role` claim from JWT |
| Docs | `/docs` enabled in non-production only |
| DB health check | `engine.connect()` inside async lifespan |

### Routers & Endpoints

**`/auth`**

| Method | Path | Auth | Rate limit | Purpose |
|--------|------|------|-----------|---------|
| `POST` | `/auth/register` | — | 5/min | Create Supabase Auth user; role assigned at registration (`seeker` or `recruiter`); returns 201 + verification prompt |
| `POST` | `/auth/token` | — | 10/min | `OAuth2PasswordRequestForm`; returns `access_token` + `refresh_token` |
| `POST` | `/auth/refresh` | — | — | Rotate both tokens from a valid refresh token |
| `POST` | `/auth/change-password` | ✓ | 5/min | Authenticated password change |

JWT algorithm: `HS256`. Access token: 15 min (env `ACCESS_TOKEN_EXPIRE_MINUTES`). Refresh token: 30 days (env `REFRESH_TOKEN_EXPIRE_DAYS`). Subject (`sub`) is the Supabase `user_id` UUID string. Token payload includes `role` claim for gateway guards.

**`/profile`** *(Job Seeker)*

| Method | Path | Auth | Role | Rate limit | Purpose |
|--------|------|------|------|-----------|---------|
| `GET` | `/profile/me` | ✓ | seeker | 60/min | Fetch own profile including view counts |
| `PATCH` | `/profile/me` | ✓ | seeker | 30/min | Update name, job title, bio, description |
| `POST` | `/profile/me/image` | ✓ | seeker | 10/min | Upload / replace profile picture |
| `POST` | `/profile/me/resume` | ✓ | seeker | 10/min | Upload resume (PDF → Storage) |
| `PATCH` | `/profile/me/links` | ✓ | seeker | 30/min | Add / update portfolio + social links |

**`/sections`**

| Method | Path | Auth | Rate limit | Purpose |
|--------|------|------|-----------|---------|
| `GET` | `/sections/{id}` | — | 120/min | Single section detail (`SectionResponse`) |
| `PATCH` | `/sections/{id}` | ✓ | 30/min | Update profile fields; enforces `owner_id == current_user` |
| `POST` | `/sections/{id}/image` | ✓ | 10/min | Multipart upload → process → Supabase Storage → update `image_url` |

**`/payments`**

| Method | Path | Auth | Rate limit | Purpose |
|--------|------|------|-----------|---------|
| `POST` | `/payments/intent` | ✓ | 20/min | Validate section is unclaimed; create Stripe PaymentIntent; persist `Payment(pending)` |
| `POST` | `/payments/webhook` | Stripe sig | — | `payment_intent.succeeded` → assign `owner_id`; `payment_failed` → mark failed |
| `GET` | `/payments/history` | ✓ | 30/min | User's payment records, descending by `created_at` |

**`/subscriptions`**

| Method | Path | Auth | Role | Rate limit | Purpose |
|--------|------|------|------|-----------|---------|
| `GET` | `/subscriptions/tiers` | — | — | 60/min | List available subscription tiers and prices |
| `GET` | `/subscriptions/me` | ✓ | any | 60/min | View current subscription + expiry |
| `POST` | `/subscriptions/checkout` | ✓ | any | 10/min | Create Stripe subscription checkout session |
| `POST` | `/subscriptions/webhook` | Stripe sig | — | — | Handle subscription lifecycle events |
| `DELETE` | `/subscriptions/me` | ✓ | any | 5/min | Cancel subscription (end of period) |

**`/jobs`** *(Recruiter-posted job listings)*

| Method | Path | Auth | Role | Rate limit | Purpose |
|--------|------|------|------|-----------|---------|
| `GET` | `/jobs/browse` | — | — | 120/min | Public job browse; supports `job_category`, `is_active`, `page`, `limit` |
| `POST` | `/jobs` | ✓ | recruiter | 20/min | Create a job post |
| `GET` | `/jobs` | ✓ | recruiter | 60/min | List own job posts |
| `GET` | `/jobs/{id}` | — | — | 120/min | Public job post detail |
| `PATCH` | `/jobs/{id}` | ✓ | recruiter | 30/min | Edit job post |
| `DELETE` | `/jobs/{id}` | ✓ | recruiter | 10/min | Remove job post |

**`/scraped-jobs`** *(Public job board — aggregated from external sources)*

| Method | Path | Auth | Rate limit | Purpose |
|--------|------|------|-----------|---------|
| `GET` | `/scraped-jobs/search` | — | — | Faceted full-text search over scraped listings; supports `query`, `category`, `work_types[]`, `experience_levels[]`, `employment_types[]`, `skills[]`, `salary_min`, `salary_max`, `location_city`, `posted_within_days`, `page`, `page_size`, `include_facets` |
| `GET` | `/scraped-jobs/{job_id}` | — | — | Single scraped job detail |

**`/applications`**

| Method | Path | Auth | Role | Rate limit | Purpose |
|--------|------|------|------|-----------|---------|
| `GET` | `/applications/me` | ✓ | seeker | 60/min | Seeker's application list + status |
| `GET` | `/applications/{id}` | ✓ | any | 120/min | Single application detail |
| `PATCH` | `/applications/{id}/status` | ✓ | recruiter | 30/min | Update application status |
| `GET` | `/applications/notifications` | ✓ | seeker | 60/min | Unread status-change notifications |
| `POST` | `/applications/notifications/{id}/read` | ✓ | seeker | 60/min | Mark notification read |

**`/search`** *(Recruiter talent search)*

| Method | Path | Auth | Role | Rate limit | Purpose |
|--------|------|------|------|-----------|---------|
| `GET` | `/search/users` | ✓ | recruiter | 60/min | Filter job seekers by category, experience, skills, keyword |
| `POST` | `/search/notify` | ✓ | recruiter | 10/min | Notify a matched user of recruiter interest |

Search filter query params: `job_category`, `experience_level`, `tech_skills[]`, `soft_skills[]`, `keyword`, `page`, `limit`.

**`/coaching`** *(Job Seeker — AI Coaching)*

| Method | Path | Auth | Role | Rate limit | Purpose |
|--------|------|------|------|-----------|---------|
| `POST` | `/coaching/resume` | ✓ | seeker | 5/min | Submit resume text for legacy AI feedback |
| `POST` | `/coaching/interview` | ✓ | seeker | 5/min | Start AI interview prep session |
| `GET` | `/coaching/history` | ✓ | seeker | 30/min | Past coaching sessions |
| `POST` | `/coaching/resume-analyze` | ✓ | seeker | 5/min | Upload PDF/DOCX resume file + job context; runs one of four AI analysis features (diagnoser, recruiter, rewriter, hiring_manager); multipart/form-data |
| `GET` | `/coaching/resume-analyze/history` | ✓ | seeker | 30/min | List past resume analyses (50 most recent) |
| `GET` | `/coaching/resume-analyze/{analysis_id}` | ✓ | seeker | 60/min | Fetch a specific analysis result by ID |

**`GET /health`** — liveness probe, no auth.

### Models

**`User`** (`public.users`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | References `auth.users(id)` |
| `email` | `TEXT UNIQUE` | |
| `role` | `TEXT` | `'seeker'`, `'recruiter'`, or `'admin'` |
| `verified_at` | `TIMESTAMPTZ` | Set on email verification |
| `created_at` | `TIMESTAMPTZ` | Server default |

**`PixelSection`** (`public.pixel_sections`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | |
| `page_number` | `SMALLINT` | 1–5 |
| `row` | `SMALLINT` | 1–50 |
| `col` | `SMALLINT` | 1–60 |
| `owner_id` | `UUID FK → users` | `NULL` = available |
| `purchased_at`, `expires_at`, `price_paid` | | Set on purchase |
| `full_name`, `job_title`, `bio(300)` | | Profile content |
| `portfolio_url`, `job_category`, `skills[]` | | Profile content |
| `experience_level` | `TEXT` | `'junior'`, `'mid'`, `'senior'` |
| `tech_skills[]`, `soft_skills[]` | `TEXT[]` | Recruiter-filterable |
| `resume_path`, `resume_url` | `TEXT` | Storage reference |
| `links` | `JSONB` | `{github, linkedin, portfolio, ...}` |
| `image_path`, `image_url`, `image_size_bytes` | | Storage reference |
| `is_published` | `BOOLEAN` | Controls public visibility |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | `updated_at` via trigger |

Unique constraint: `(page_number, row, col)`. Indexes on `page_number`, `owner_id`, `job_category`, `experience_level`.

**`ScrapedJob`** (`public.scraped_jobs`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `TEXT PK` | Content hash (dedup key) |
| `source` | `TEXT` | Source identifier (e.g. `remoteok`, `adzuna`) |
| `source_id` | `TEXT` | Source's own ID |
| `source_url` | `TEXT` | Original listing URL |
| `title` | `TEXT` | |
| `company` | `TEXT` | |
| `company_id` | `TEXT` | |
| `location_city`, `location_country` | `TEXT` | Normalized location |
| `remote_raw` | `TEXT` | Raw remote string before normalization |
| `work_type` | `TEXT` | `remote`, `hybrid`, `onsite` |
| `employment_type` | `TEXT` | `full_time`, `part_time`, `contract`, `freelance`, `internship` |
| `experience_level` | `TEXT` | `entry_level`, `mid_level`, `senior`, `manager`, `director`, `executive`, `internship` |
| `category` | `TEXT` | `engineering`, `data`, `finance`, `design`, `marketing`, `sales`, `operations`, `product`, `other` |
| `description` | `TEXT` | Raw HTML description |
| `description_text` | `TEXT` | Plain-text description |
| `skills` | `TEXT[]` | Extracted skill tokens |
| `salary_min`, `salary_max` | `INTEGER` | Annual USD cents-equivalent |
| `salary_raw` | `TEXT` | Original salary string |
| `posted_at` | `TIMESTAMPTZ` | |
| `scraped_at` | `TIMESTAMPTZ` | Server default |
| `expires_at` | `TIMESTAMPTZ` | TTL — soft-deleted when past |
| `is_active` | `BOOLEAN` | `false` = expired or de-listed |

**`Payment`** (`public.payments`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | |
| `user_id` | `UUID FK → users` | |
| `pixel_section_id` | `UUID FK → pixel_sections` | |
| `stripe_payment_intent_id` | `TEXT UNIQUE` | |
| `amount` | `NUMERIC(10,2)` | In dollars |
| `status` | `TEXT` | `pending → succeeded / failed` |

**`Subscription`** (`public.subscriptions`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | |
| `user_id` | `UUID FK → users` | |
| `stripe_subscription_id` | `TEXT UNIQUE` | |
| `tier` | `TEXT` | `'basic'`, `'standard'`, `'premium'` |
| `status` | `TEXT` | `'active'`, `'cancelled'`, `'past_due'` |
| `current_period_start` | `TIMESTAMPTZ` | Date of last payment; set by Stripe webhook |
| `current_period_end` | `TIMESTAMPTZ` | Date of next payment / access expiry |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | |

**`JobPost`** (`public.job_posts`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | |
| `recruiter_id` | `UUID FK → users` | |
| `title`, `description` | `TEXT` | |
| `job_category` | `TEXT` | |
| `required_tech_skills[]`, `required_soft_skills[]` | `TEXT[]` | |
| `experience_level` | `TEXT` | |
| `is_active` | `BOOLEAN` | |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | |

**`Application`** (`public.applications`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | |
| `seeker_id` | `UUID FK → users` | |
| `job_post_id` | `UUID FK → job_posts` | |
| `status` | `TEXT` | `'applied'`, `'viewed'`, `'shortlisted'`, `'rejected'` |
| `notification_sent` | `BOOLEAN` | |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | |

Unique constraint: `(seeker_id, job_post_id)`.

**`CoachingSession`** (`public.coaching_sessions`) — AI session records per user.

**`Notification`** (`public.notifications`) — In-app notifications for seekers (application status changes, recruiter interest).

**`ResumeAnalysis`** (`public.resume_analyses`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | |
| `user_id` | `UUID FK → public.users` | Schema-qualified FK; CASCADE on delete |
| `feature` | `TEXT` | `'diagnoser'`, `'recruiter'`, `'rewriter'`, `'hiring_manager'` |
| `job_position` | `TEXT` | Job title submitted with the analysis |
| `company` | `TEXT` | Company name submitted with the analysis |
| `job_description` | `TEXT` | Job description submitted with the analysis |
| `resume_version` | `INTEGER` | Increments per unique resume hash for this user |
| `resume_hash` | `TEXT` | SHA-256 of uploaded file bytes (dedup key) |
| `parsed_resume` | `JSONB` | Structured parse output (name, experience, skills, etc.) |
| `prompt_version` | `TEXT` | Active prompt version at analysis time (default `'v1.0'`) |
| `model_used` | `TEXT` | OpenRouter model identifier actually used |
| `raw_response` | `TEXT` | Raw LLM text output (for debugging) |
| `parsed_response` | `JSONB` | Extracted JSON result displayed to user |
| `parse_success` | `BOOLEAN` | Whether JSON extraction from raw response succeeded |
| `tokens_input` | `INTEGER` | Prompt token count |
| `tokens_output` | `INTEGER` | Completion token count |
| `latency_ms` | `INTEGER` | End-to-end LLM call duration |
| `created_at` | `TIMESTAMPTZ` | Server default |

RLS: users can only read/insert their own rows.

**`PromptTemplate`** (`public.prompt_templates`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | |
| `feature` | `TEXT` | Feature key: `'classifier'`, `'parser'`, `'diagnoser'`, `'recruiter'`, `'rewriter'`, `'hiring_manager'` |
| `version` | `TEXT` | Semantic version string (e.g. `'v1.0'`) |
| `is_active` | `BOOLEAN` | Only one active prompt per feature at a time |
| `prompt_text` | `TEXT` | Full prompt template with `{{placeholder}}` tokens |
| `created_at` | `TIMESTAMPTZ` | Server default |

Unique constraint: `(feature, version)`. Prompts are seeded at migration time (migration 004). The service fetches the active prompt at runtime — never hardcoded.

### Services

**`stripe_service.py`**

```
PAGE_PRICES = { 1: 1000¢, 2: 699¢, 3: 500¢, 4: 399¢, 5: 299¢ }

create_payment_intent(page_number, section_id, user_id)
  → stripe.PaymentIntent  (metadata carries section + user IDs)

verify_webhook(payload, sig_header)
  → stripe.Event  (raises 400 on invalid signature)
```

**`subscription_service.py`**

```
TIER_PRICES = { 'basic': 499¢/mo, 'standard': 1499¢/mo, 'premium': 2499¢/mo }

get_tiers()
  → list of tier dicts with price_cents, label, features

create_checkout_session(user_id, tier, return_url)
  → Stripe Checkout Session URL
  Uses STRIPE_*_PRICE_ID env vars; falls back to inline price_data if unset

handle_subscription_event(db, event)
  → UPSERT public.subscriptions
       tier, status, current_period_start, current_period_end updated from Stripe webhook

cancel_subscription(db, user_id)
  → stripe.Subscription.cancel (at_period_end=True); sets status = 'cancelled'

GET /subscriptions/me returns null (200) when user has no subscription record
```

**`scraped_job_service.py`**

```
search_scraped_jobs(params: ScrapedJobSearchParams, db: Session)
  → ScrapedJobSearchResponse  (jobs + optional facets + total + took_ms)

  Filters: query (ILIKE title/company/description), category, work_types[],
           experience_levels[], employment_types[], skills[] (&&),
           salary_min/max, location_city (ILIKE), posted_within_days

  Facets (when include_facets=true):
    work_types, experience_levels, employment_types, categories,
    top_skills, salary_stats

  Note: category facet computed without active category filter
        so all tabs are always visible regardless of selection.

get_scraped_job(job_id: str, db: Session)
  → ScrapedJobDetail | None
```

**`storage.py`**

Singleton Supabase client (service role). Bucket: `profiles` (env `SUPABASE_STORAGE_BUCKET`).

| Upload type | Storage path |
|-------------|-------------|
| Profile image | `sections/{section_id}/{filename}` |
| Resume | `resumes/{user_id}/{filename}` |

**`image_processor.py`**

Validates MIME type via `python-magic`. Resizes with Pillow. Outputs WebP bytes + a deterministic filename.

**`search_service.py`**

```
filter_seekers(filters: SearchFilters) → List[GridSectionResponse]

SearchFilters:
  job_category, experience_level
  tech_skills[], soft_skills[]   # any-of match (&&)
  keyword                        # ILIKE on full_name, job_title, bio
  page, limit (max 50)
```

**`notification_service.py`** — writes to `public.notifications`; enqueues email via background worker.

**`ai_coaching_service.py`** — calls LLM API (env `AI_MODEL`); persists session; returns structured coaching feedback for legacy resume text + interview prep endpoints.

**`ai_resume_service.py`**

Full pipeline for AI resume file analysis. Stages run in sequence:

```
1. validate_structure(file_bytes, filename)
   ├─ ext check: only .pdf / .docx accepted (WRONG_TYPE)
   ├─ pdfplumber (PDF) or python-docx (DOCX) text extraction (UNREADABLE)
   ├─ word_count < 50 → UNREADABLE
   └─ page_count > 2 → PAGE_LIMIT

2. classify_resume(resume_text, db)          [CHEAP_MODEL]
   ├─ Fetches 'classifier' prompt template from DB
   └─ Returns { is_resume, confidence, detected_as }
        if not is_resume + confidence in (high, medium) → NOT_RESUME error

3. parse_resume(resume_text, db)             [CHEAP_MODEL]
   ├─ Fetches 'parser' prompt template from DB
   └─ Returns structured JSON: candidate_name, contact, summary,
      experience[], education[], skills[], certifications[],
      word_count, inferred_seniority

4. run_feature(feature, job_position, company, job_description,
               parsed_resume, missing_keywords, db)  [FRONTIER_MODEL]
   ├─ Fetches feature-specific prompt template from DB
   ├─ Replaces placeholders: {{job_position}}, {{company}},
   │   {{job_description}}, {{seniority}}, {{resume_json}}, {{missing_keywords}}
   ├─ temperature=0.3 for rewriter, 0.0 for all others
   └─ max_tokens scaled by resume word_count + feature verbosity

5. safe_parse_json(raw)
   ├─ Strip markdown code fences (regex)
   ├─ Try json.loads on full response
   └─ Fallback: extract substring from first '{' to last '}'

6. save_analysis(db, user_id, …)
   └─ INSERT public.resume_analyses; resume_version increments per hash
```

Four feature types and their output shape:

| Feature | `FeatureType` | Output fields |
|---------|-------------|--------------|
| Resume Diagnoser | `'diagnoser'` | `overall_score`, `category_scores{}`, `strengths[]`, `improvements[]`, `keyword_gaps[]`, `ats_flags[]` |
| Resume Recruiter | `'recruiter'` | `shortlist_likelihood`, `top_keywords[]`, `keyword_gaps[]`, `recruiter_verdict`, `recruiter_rationale`, `fit_score`, `candidate_summary` |
| Resume Rewriter | `'rewriter'` | `rewritten_bullets[]`, `summary_suggestion`, `keywords_woven_in[]` |
| Hiring Manager | `'hiring_manager'` | `hire_recommendation`, `strengths[]`, `concerns[]`, `interview_focus_areas[]`, `verdict_rationale`, `culture_fit_signals[]`, `development_plan[]` |

Token budget (approximate):

| Word count | Base | Recruiter/HM | Rewriter |
|-----------|------|-------------|---------|
| < 400 words | 3000 | 6000 | 5000 |
| 400–700 words | 4000 | 7000 | 6000 |
| > 700 words | 5000 | 8000 | 7000 |

### Database

```
pool_pre_ping=True   (stale connection recovery)
pool_size=10
max_overflow=20

get_db() → generator; always closes in finally
```

Migrations: **Alembic** (`migrations/alembic.ini`). Raw bootstrap SQL in `migrations/001_initial_schema.sql`.

### Environment Variables (backend)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (escape `%` as `%%` in Alembic env.py) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for Auth admin + Storage |
| `STRIPE_SECRET_KEY` | Stripe secret |
| `STRIPE_WEBHOOK_SECRET` | Payment webhook signing secret |
| `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` | Subscription webhook signing secret |
| `JWT_SECRET` | HS256 signing secret |
| `FRONTEND_URL` | Primary allowed CORS origin (default: `http://localhost:3000`) |
| `ENVIRONMENT` | `production` disables `/docs` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Default: `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Default: `30` |
| `SUPABASE_STORAGE_BUCKET` | Default: `profiles` |
| `AI_API_KEY` | LLM provider key (legacy coaching service) |
| `AI_MODEL` | LLM model identifier (legacy coaching service) |
| `OPENROUTER_API_KEY` | OpenRouter API key (AI resume analysis pipeline) |
| `OPENROUTER_BASE_URL` | OpenRouter base URL (default: `https://openrouter.ai/api/v1`) |
| `OPENROUTER_FRONTIER_MODEL` | Model for feature runs — diagnoser, recruiter, rewriter, hiring_manager (e.g. `google/gemini-3-flash-preview`) |
| `OPENROUTER_CHEAP_MODEL` | Model for classifier + parser steps (e.g. `openai/gpt-4o-mini`) |

### Running the Backend

```bash
cd pixelhire/backend
source venv/bin/activate          # Python 3.14 venv
uvicorn main:app --reload --port 8000

# Migrations
alembic -c migrations/alembic.ini upgrade head
```

---

## Job Scraper Pipeline (`job_scraper/`)

Standalone Python package that continuously harvests job listings from public sources, normalizes them, deduplicates, and writes to `public.scraped_jobs` + Elasticsearch.

### Architecture

```
CLI entry: python cli.py <subcommand>

Subcommands:
  raw        Fan-out to all raw sources → insert into raw_jobs staging table
  normalize  Pull from raw_jobs → normalize → deduplicate → upsert scraped_jobs
  es         Elasticsearch management: setup / reindex / status / delete-job
  run        Full pipeline: raw + normalize (default runner)
  schedule   Continuous loop (SCRAPE_INTERVAL_HOURS)
```

### Pipeline Stages

```
1. Raw collection (raw/runner.py)
   ├── API sources: Adzuna, Dice, HN Hiring, Himalayas, Jobicy, JSearch,
   │               RemoteOK, Remotive, SerpAPI, RareRoles, StillHiring, Wellfound
   ├── Each source returns list[dict] (raw, unnormalized)
   └── INSERT into raw_jobs staging table (raw/storage.py)

2. Normalization (runner.py + normalizer.py)
   ├── normalize_posted_at()    → datetime | None
   ├── normalize_salary()       → (min_cents, max_cents, raw_str)
   ├── normalize_work_type()    → remote | hybrid | onsite | None
   ├── normalize_exp_level()    → entry_level | mid_level | senior | manager | director | executive | internship | None
   ├── normalize_employment_type() → full_time | part_time | contract | freelance | internship | None
   ├── extract_skills()         → list[str]  (keyword extraction from title + description)
   ├── map_category()           → engineering | data | finance | design | marketing | sales | operations | product | other
   └── strip_html()             → plain text description

3. Deduplication (deduplicator.py)
   ├── compute_content_hash()   → SHA-256 of (source_id + title + company)
   └── is_fuzzy_duplicate()     → RapidFuzz token_sort_ratio ≥ 90

4. Storage
   ├── upsert_scraped_job()     → INSERT … ON CONFLICT DO UPDATE (asyncpg)
   └── purge_expired()          → soft-delete via is_active=false past expires_at

5. Elasticsearch sync (es_indexer.py)
   ├── index_job()              → single doc index/update
   ├── index_batch()            → bulk indexing
   └── full_reindex()           → delete + recreate index from DB
```

### Elasticsearch Index

```
Index name: jobs  (env ELASTICSEARCH_INDEX)
Mapping highlights:
  title, company, description_text  → text (analyzed)
  category, work_type, experience_level, employment_type, source  → keyword
  skills  → keyword[]
  salary_min, salary_max  → integer
  posted_at, scraped_at, expires_at  → date
  location_city, location_country  → keyword
```

### Adapters (Playwright-based)

Browser automation adapters for boards that require JS rendering or session cookies: LinkedIn, Glassdoor, Wellfound, CareerBuilder, Dice, Indeed, Google Jobs, ZipRecruiter. Each extends `BaseAdapter.adapt(raw: dict) → ScrapedJob | None`.

Anti-detect layer (`anti_detect/`): randomized browser profiles, proxy pool rotation, per-request throttle.

### Environment Variables (job_scraper)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ELASTICSEARCH_URL` | Elasticsearch endpoint |
| `ELASTICSEARCH_API_KEY` | Elasticsearch API key |
| `ELASTICSEARCH_INDEX` | Index name (default: `jobs`) |
| `JSEARCH_KEY` | RapidAPI key for JSearch |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Adzuna API credentials |
| `SERPAPI_KEY` | SerpAPI key |
| `LINKEDIN_LI_AT` | LinkedIn session cookie |
| `WELLFOUND_SESSION` | Wellfound session cookie |
| `GLASSDOOR_SESSION` | Glassdoor session cookie |
| `PROXY_LIST` | Comma-separated proxy URLs for anti-detect |
| `MAX_AGE_HOURS` | Job TTL (default: 24) |
| `SCRAPE_INTERVAL_HOURS` | Scheduler interval (default: 1) |
| `CONCURRENT_ADAPTERS` | Parallel adapter limit (default: 4) |

### Running the Scraper

```bash
cd job_scraper
source .venv/bin/activate

python cli.py raw                    # collect raw listings
python cli.py normalize              # normalize + upsert to DB
python cli.py es setup               # create Elasticsearch index
python cli.py es reindex             # full reindex from DB
python cli.py es status              # index doc count + health
python cli.py schedule               # continuous pipeline loop
```

---

## Frontend (`pixelhire/frontend/`)

### Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 14.2.3 (App Router) |
| Language | TypeScript 5.4 |
| Styling | React inline style objects (no Tailwind for layouts) |
| Auth | Custom `AuthProvider` + hooks |
| Payments | `@stripe/stripe-js` |
| Storage images | `next/image` (remotePatterns: `*.supabase.co`) |

### Directory Structure

```
app/
├── layout.tsx                      Root layout — AuthProvider, Navbar, global fonts
├── globals.css                     CSS variables, keyframe animations, resets
├── page.tsx                        / — Homepage
├── about/page.tsx                  /about — Founder story + mission
├── contact/page.tsx                /contact — Email card
├── pricing/page.tsx                /pricing — Subscription tiers (Basic/Standard/Premium)
├── login/page.tsx                  /login — Sign-in form
├── register/page.tsx               /register — Registration with role selection
├── talent/page.tsx                 /talent — Public talent discovery page
├── find-work/
│   └── jobs/
│       ├── page.tsx                /find-work/jobs — Public job board (faceted search + filters)
│       └── [id]/page.tsx           /find-work/jobs/[id] — Job detail with structured description
├── jobs/
│   └── [category]/page.tsx         /jobs/[category] — Redirect → /find-work/jobs?category=…
├── dashboard/                      Auth-protected seeker hub
│   ├── page.tsx                    /dashboard — Overview
│   ├── profile/page.tsx            /dashboard/profile — Edit profile fields + links
│   ├── applications/page.tsx       /dashboard/applications — Application status list
│   ├── coaching/page.tsx           /dashboard/coaching — AI coaching sessions
│   ├── jobs/page.tsx               /dashboard/jobs — Saved / applied jobs
│   └── settings/page.tsx           /dashboard/settings — Password, notifications, account
├── recruiter/                      Auth-protected recruiter hub
│   ├── page.tsx                    /recruiter — Dashboard with quick links
│   ├── search/page.tsx             /recruiter/search — Advanced talent search + filter
│   ├── jobs/page.tsx               /recruiter/jobs — Manage job posts
│   ├── jobs/new/page.tsx           /recruiter/jobs/new — Create job post
│   └── hire/[category]/page.tsx    /recruiter/hire/[category] — Browse talent by category
└── subscription/
    ├── page.tsx                    /subscription — View current tier
    └── manage/page.tsx             /subscription/manage — Billing management: cancel subscription, last/next payment dates

components/
├── Navbar.tsx                Nav: Home · About · Pricing · Find Work · Contact
│                             Role-aware: "Hire Talent" dropdown for recruiters
├── ScrapedJobCard.tsx        Public job board card (light theme, LinkedIn-style)
├── TalentCard.tsx            Recruiter-facing seeker profile card
├── JobListingCard.tsx        Seeker-facing recruiter job post card
├── JobSearchFilters.tsx      Filter panel for recruiter job search
├── SearchFilters.tsx         Filter panel for talent search
├── ImageUpload.tsx           Dropzone + crop UI for profile image
├── ResumeUpload.tsx          Dropzone for PDF resume upload
├── LinkEditor.tsx            Add / edit portfolio + social links
├── ApplicationList.tsx       Seeker's application status tracker
├── NotificationBadge.tsx     Unread notification count indicator
├── JobPostForm.tsx           Recruiter job post creation / edit form
└── SubscriptionBadge.tsx     Current tier pill

lib/
├── api.ts                    All fetch() calls to backend REST API
├── auth-context.tsx          AuthProvider + useAuth() hook
├── job-utils.ts              formatSalary · formatRelativeDate · formatSource
├── stripe.ts                 Stripe.js client initialisation
└── supabase.ts               Supabase client (browser-side, anon key)

types/
├── index.ts                  Shared TypeScript interfaces + label constants
└── job-categories.ts         Category spec map: slug → apiValue, color, roles, copy
```

### Routing

| Route | File | Auth | Role |
|-------|------|------|------|
| `/` | `app/page.tsx` | No | — |
| `/about` | `app/about/page.tsx` | No | — |
| `/contact` | `app/contact/page.tsx` | No | — |
| `/pricing` | `app/pricing/page.tsx` | No | — |
| `/talent` | `app/talent/page.tsx` | No | — |
| `/find-work/jobs` | `app/find-work/jobs/page.tsx` | No | — |
| `/find-work/jobs/[id]` | `app/find-work/jobs/[id]/page.tsx` | No | — |
| `/jobs/[category]` | `app/jobs/[category]/page.tsx` | No | — redirect |
| `/login` | `app/login/page.tsx` | No | — |
| `/register` | `app/register/page.tsx` | No | — |
| `/dashboard` | `app/dashboard/page.tsx` | Yes → `/login` | seeker |
| `/dashboard/profile` | `app/dashboard/profile/page.tsx` | Yes | seeker |
| `/dashboard/applications` | `app/dashboard/applications/page.tsx` | Yes | seeker |
| `/dashboard/coaching` | `app/dashboard/coaching/page.tsx` | Yes | seeker — tabs: Resume (legacy text), Interview Prep, AI Analyze (file upload + 4 feature types) |
| `/dashboard/jobs` | `app/dashboard/jobs/page.tsx` | Yes | seeker |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | Yes | seeker |
| `/recruiter` | `app/recruiter/page.tsx` | Yes → `/login` | recruiter |
| `/recruiter/search` | `app/recruiter/search/page.tsx` | Yes | recruiter |
| `/recruiter/jobs` | `app/recruiter/jobs/page.tsx` | Yes | recruiter |
| `/recruiter/jobs/new` | `app/recruiter/jobs/new/page.tsx` | Yes | recruiter |
| `/recruiter/hire/[category]` | `app/recruiter/hire/[category]/page.tsx` | Yes | recruiter |
| `/subscription` | `app/subscription/page.tsx` | Yes | any |
| `/subscription/manage` | `app/subscription/manage/page.tsx` | Yes | any — billing management (cancel, payment dates); all dashboard subscription buttons route here |

`params` in dynamic routes is a plain object (Next.js 14 — not a Promise, never use `use(params)`).

### Navbar

Fixed 60px height, scroll-aware border/shadow. Links (center): **Home · About · Pricing · Find Work · Contact**. Role-aware right section: "Hire Talent" category dropdown for recruiters; Dashboard + Sign out when authenticated; Sign in + Get started when logged out.

### Find Work Page (`/find-work/jobs`)

Public job board powered by `GET /scraped-jobs/search`. Key features:
- **Category tabs** — single row derived from `facets.categories`; overflow tabs collapse into "More (n) ▾" dropdown detected via `ResizeObserver`
- **Filter sidebar** — sticky, scrollable (`maxHeight: calc(100vh - 100px)`); filter dropdowns for Work type / Experience / Employment type; type-to-search for skills; salary range inputs; posted within select
- **Smart keyword detection** — `detectFromQuery()` parses the keyword field for signals (e.g. "remote", "senior", "full-time") and auto-highlights matching filters with amber "auto" indicators
- **URL state sync** — all filters reflected in query string via `router.replace()`
- **Salary display** — only shown when `salary_min` or `salary_max` is non-zero

### Job Detail Page (`/find-work/jobs/[id]`)

Fetches via `GET /scraped-jobs/{id}`. Features:
- `StructuredDescription` component — parses raw HTML/text into heading / paragraph / bullet-list blocks using `looksLikeHeading()` keyword detection and `parseBullet()` pattern matching
- Salary pill only shown when salary data present
- "Apply on {Source}" link opens original listing URL

### Auth Flow

```
Mount
  └─ localStorage.getItem("refresh_token")
       └─ doRefresh() → POST /auth/refresh { refresh_token }
            ├─ success → accessToken in React state; userId + role decoded from JWT
            │            scheduleRefresh(accessToken) — schedules proactive refresh
            └─ failure → clear localStorage

Register
  └─ role selected at registration form (seeker | recruiter)
       └─ POST /auth/register { email, password, role }
            └─ on success → redirect to role-appropriate dashboard

Login
  └─ POST /auth/token (form-encoded username/password)
       └─ accessToken → React state (memory only, never persisted)
          refresh_token → localStorage
          role → decoded from JWT
          scheduleRefresh(accessToken) — starts proactive refresh chain

Logout
  └─ clearTimeout(refreshTimer) + clear state + localStorage

Proactive Refresh (auth-context.tsx)
  └─ scheduleRefresh(token)
       ├─ Decodes JWT exp claim
       ├─ delay = max(0, exp*1000 - Date.now() - 60_000)  (60s before expiry)
       └─ setTimeout → doRefresh() → if success → scheduleRefresh(newToken)
            (self-chaining: refresh chain runs indefinitely while tab is open)

useAuth() exposes: { accessToken, userId, role, isLoading, login, register, logout }
```

Access token is kept in memory only (XSS protection). Refresh token in localStorage is the persistence layer. Proactive refresh prevents token expiry mid-session without requiring any user action.

### Type System (`types/index.ts`)

| Type / Constant | Purpose |
|----------------|---------|
| `ScrapedJob` | Card-level scraped job (from search results) |
| `ScrapedJobDetail` | Full detail (extends ScrapedJob + description_html, source_urls) |
| `ScrapedJobFacets` | Facet counts: work_types, experience_levels, employment_types, categories, top_skills, salary_stats |
| `ScrapedJobSearchState` | Full search filter state (query, category, work_types[], …) |
| `WORK_TYPE_LABELS` | `remote → "Remote"`, `hybrid → "Hybrid"`, `onsite → "On-site"` |
| `EXP_LEVEL_LABELS` | `entry_level → "Entry Level"`, `senior → "Senior"`, … |
| `EMPLOYMENT_TYPE_LABELS` | `full_time → "Full-time"`, `contract → "Contract"`, … |
| `PixelSection` | Full section detail |
| `Payment` | Payment record |
| `Subscription` | User subscription + tier info |
| `JobPost` | Recruiter job post |
| `Application` | Application record with status |
| `Notification` | Application status-change notification |
| `CoachingSession` | AI coaching session record |
| `PAGE_PRICES` | `Record<1\|2\|3\|4\|5, number>` — prices in dollars |
| `FeatureType` | `'diagnoser' \| 'recruiter' \| 'rewriter' \| 'hiring_manager'` |
| `ValidationError` | Error shape returned by `POST /coaching/resume-analyze` on 422 |
| `ResumeAnalysisResponse` | Full analysis result: `analysis_id`, `feature`, `result{}`, `model_used`, `latency_ms`, `created_at` |
| `ResumeAnalysisHistoryItem` | Summary row for history list: `analysis_id`, `feature`, `job_position`, `company`, `created_at` |
| `DiagnoserResult` | `overall_score`, `category_scores{}`, `strengths[]`, `improvements[]`, `keyword_gaps[]`, `ats_flags[]` |
| `RecruiterResult` | `shortlist_likelihood`, `top_keywords[]`, `keyword_gaps[]`, `recruiter_verdict`, `recruiter_rationale`, `fit_score`, `candidate_summary` |
| `HiringManagerResult` | `hire_recommendation`, `strengths[]`, `concerns[]`, `interview_focus_areas[]`, `verdict_rationale`, `culture_fit_signals[]`, `development_plan[]` |
| `RewriterResult` | `rewritten_bullets[]`, `summary_suggestion`, `keywords_woven_in[]` |

### Subscription Tiers (Pricing Page)

`/pricing` is the sole entry point for starting a subscription (routes to Stripe Checkout). `/subscription/manage` is for billing management only (cancel, view payment dates) — it contains no pricing content.

| Tier | Price | Features |
|------|-------|---------|
| Basic | $4.99/mo | Name display, resume upload, tech skills listing, profile picture, portfolio & social links, soft skills listing |
| Standard | $14.99/mo | All Basic + branding bio, see who viewed your profile, recruiter notifications |
| Premium | $24.99/mo | All Standard + boosted search ranking, featured on category pages, interview % indicator |

### Security Headers (`next.config.mjs`)

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | Allows: self, Stripe JS, Google Fonts, Supabase CDN, backend API |

### Environment Variables (frontend)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend base URL (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser-safe) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### Running the Frontend

```bash
cd pixelhire/frontend
npm run dev        # dev server on :3000
npm run build      # production build
npm run type-check # tsc --noEmit
```

---

## Database Schema Summary

```
public.users           ← extends auth.users (Supabase Auth)
  id (FK → auth.users)
  email, role ('seeker' | 'recruiter' | 'admin'), verified_at, created_at

public.pixel_sections  ← 9,000 rows pre-seeded (5 pages × 60 cols × 30 rows)
  id, page_number (1–5), row, col         (unique constraint)
  owner_id FK → users                     (NULL = available)
  purchased_at, expires_at, price_paid
  full_name, job_title, bio, portfolio_url, job_category, skills[]
  experience_level, tech_skills[], soft_skills[]
  resume_path, resume_url
  links (JSONB)
  image_path, image_url, image_size_bytes, image_uploaded_at
  is_published, created_at, updated_at

public.scraped_jobs    ← populated by job_scraper pipeline
  id (content hash PK), source, source_id, source_url
  title, company, company_id
  location_city, location_country
  work_type, employment_type, experience_level, category
  description (HTML), description_text (plain)
  skills[], salary_min, salary_max, salary_raw
  posted_at, scraped_at, expires_at, is_active

public.payments
  id, user_id FK, pixel_section_id FK
  stripe_payment_intent_id (unique), amount, status, created_at

public.subscriptions
  id, user_id FK
  stripe_subscription_id (unique)
  tier ('basic' | 'standard' | 'premium'), status ('active' | 'cancelled' | 'past_due')
  current_period_start, current_period_end, created_at, updated_at

public.job_posts
  id, recruiter_id FK
  title, description, job_category
  required_tech_skills[], required_soft_skills[], experience_level
  is_active, created_at, updated_at

public.applications
  id, seeker_id FK, job_post_id FK
  status ('applied' | 'viewed' | 'shortlisted' | 'rejected')
  notification_sent, created_at, updated_at

public.coaching_sessions
  id, user_id FK, type, prompt, response, created_at

public.notifications
  id, user_id FK, type, payload (JSONB), read_at, created_at

public.resume_analyses  ← AI resume file analysis results (migration 004)
  id, user_id FK → public.users
  feature ('diagnoser' | 'recruiter' | 'rewriter' | 'hiring_manager')
  job_position, company, job_description
  resume_version (int, per user+hash), resume_hash (SHA-256)
  parsed_resume (JSONB), prompt_version
  model_used, raw_response, parsed_response (JSONB)
  parse_success (bool), tokens_input, tokens_output, latency_ms
  created_at

public.prompt_templates  ← LLM prompt templates, DB-managed (migration 004)
  id, feature, version, is_active (bool)
  prompt_text (full template with {{placeholder}} tokens)
  created_at
  UNIQUE(feature, version)
  Seeded at migration time with 6 prompts: classifier, parser,
  diagnoser, recruiter, rewriter, hiring_manager

public.pixel_views     ← analytics (insert-only via RLS)
  id, pixel_section_id FK, viewer_ip_hash, viewed_at
```

**Row Level Security** is enabled on all tables. Key policies:
- `users`: each user reads/updates only their own row
- `pixel_sections`: public can read `is_published=true` and unowned sections; owners can read/update their own
- `scraped_jobs`: public read access (no auth required)
- `payments`: users see only their own payments
- `subscriptions`: users see only their own subscription
- `job_posts`: recruiter reads/writes only their own posts; public can read `is_active=true`
- `applications`: seeker sees own applications; recruiter sees applications to their job posts
- `pixel_views`: insert allowed for all; select restricted to section owner
- `resume_analyses`: users can read/insert only their own rows
- `prompt_templates`: public read access; no user writes (admin-only via migration)

---

## Data Flow: Section Purchase

```
1. User clicks "Claim" on a section
   └─ If unauthenticated → redirect /login

2. POST /payments/intent
   ├─ Verify section.owner_id IS NULL  (409 if already claimed)
   ├─ create_payment_intent(page_number, section_id, user_id)
   │     → Stripe PaymentIntent (amount from PAGE_PRICES)
   └─ INSERT Payment(status="pending")

3. Client confirms payment via Stripe.js (client_secret)

4. POST /payments/webhook  (Stripe → backend)
   └─ event: payment_intent.succeeded
        ├─ Payment.status = "succeeded"
        └─ PixelSection.owner_id = user_id
           PixelSection.purchased_at = now()
           PixelSection.price_paid = amount
```

---

## Data Flow: Scraped Job Search

```
1. GET /scraped-jobs/search?query=senior+remote+python&category=engineering&page=0
   └─ scraped_job_service.search_scraped_jobs(params, db)
        ├─ _build_where() → SQL conditions + bind params
        │   (category facet uses skip_category=True to show all tabs)
        ├─ SELECT … FROM scraped_jobs WHERE is_active=true AND conditions
        │   LIMIT 20 OFFSET 0
        ├─ _fetch_facets() when include_facets=true
        │   → work_types, experience_levels, employment_types,
        │     categories, top_skills, salary_stats
        └─ Returns ScrapedJobSearchResponse { jobs, facets, total, took_ms }

2. Frontend detectFromQuery("senior remote python")
   → auto-highlights: experience_levels=["senior"], work_types=["remote"]
   → merged with manual filter state before API call
```

---

## Data Flow: Recruiter Talent Search

```
1. GET /search/users?job_category=Technical&experience_level=senior&tech_skills=Python,FastAPI
   └─ role_guard: requires 'recruiter'

2. search_service.filter_seekers(filters)
   ├─ SELECT from pixel_sections WHERE is_published=true AND owner_id IS NOT NULL
   ├─ AND job_category = :category
   ├─ AND experience_level = :level
   ├─ AND tech_skills && :skills[]   (array overlap)
   ├─ AND (full_name ILIKE :kw OR bio ILIKE :kw)
   └─ ORDER BY updated_at DESC  LIMIT :limit OFFSET :offset

3. POST /search/notify { user_id, message }
   └─ notification_service.notify_user(user_id, ...)
        ├─ INSERT public.notifications
        └─ enqueue email → background worker
```

---

## Data Flow: Subscription

```
Entry point: /pricing (sole page for initiating a new subscription)
Management:  /subscription/manage (cancel, view billing dates — no pricing content)

Dashboard subscription card:
  └─ "Manage" button (active plan) → /subscription/manage
  └─ "Upgrade" button (free/no plan) → /subscription/manage
       └─ manage page empty state → /pricing ("View plans →")

1. POST /subscriptions/checkout { tier: "standard", return_url }
   └─ subscription_service.create_checkout_session(user_id, tier, return_url)
        ├─ Uses STRIPE_*_PRICE_ID env var if set
        └─ Falls back to inline price_data if env var missing
        → Stripe Checkout Session URL

2. Client redirects to Stripe hosted checkout

3. POST /subscriptions/webhook (Stripe → backend)
   └─ event: customer.subscription.created / updated / deleted
        └─ UPSERT public.subscriptions
             ├─ tier, status updated
             ├─ current_period_start set (last payment date)
             ├─ current_period_end set (next payment / access expiry date)
             └─ user gains/loses feature access by tier

4. GET /subscriptions/me
   └─ Returns subscription row or null (200) — never 404
```

---

## Data Flow: AI Resume Analysis

```
1. User fills job position, company, job description, selects feature,
   uploads resume file (PDF or DOCX) on /dashboard/coaching → "AI Analyze" tab

2. POST /coaching/resume-analyze  (multipart/form-data)
   └─ ai_resume_service.analyze_resume(file_bytes, filename, …, feature, db)

        Stage 1 — Structural validation (no LLM)
        ├─ pdfplumber / python-docx → extract text + page count
        ├─ word_count < 50 → UNREADABLE (422)
        └─ page_count > 2 → PAGE_LIMIT (422)

        Stage 2 — Classification [CHEAP_MODEL]
        ├─ Prompt: 'classifier' template from prompt_templates
        └─ { is_resume, confidence, detected_as }
             not is_resume + high/medium confidence → NOT_RESUME (422)

        Stage 3 — Parse [CHEAP_MODEL]
        └─ Prompt: 'parser' template
             → structured JSON: name, experience[], skills[], seniority, word_count

        Stage 4 — Feature run [FRONTIER_MODEL]
        ├─ Prompt: feature-specific template, placeholders replaced
        ├─ temperature=0.3 (rewriter) or 0.0
        └─ max_tokens scaled by word_count + feature

        Stage 5 — safe_parse_json
        ├─ Strip markdown fences (regex)
        ├─ json.loads full response
        └─ fallback: extract first { … last }

        Stage 6 — Persist to public.resume_analyses
        └─ resume_version = COUNT(same user + same hash) + 1

3. Returns ResumeAnalysisResponse { analysis_id, feature, result{}, model_used, latency_ms, created_at }

4. Frontend renders feature-specific result card:
   DiagnoserCard / RecruiterCard / RewriterCard / HiringManagerCard
   Recruiter keyword_gaps auto-passed as missing_keywords when switching to Rewriter tab
```

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Backend issues its own JWTs | Decouples session from Supabase; allows custom expiry, refresh rotation, and `role` claim embedding |
| `role` embedded in JWT payload | Avoids DB lookup on every request; role_guard reads it directly from the token |
| Access token in memory only | Eliminates XSS token theft via localStorage |
| Supabase Auth as identity provider only | Backend calls `auth.admin.create_user` and `sign_in_with_password`; session lives in FastAPI |
| Sections pre-seeded at migration time | Grid reads are simple SELECT with no existence checks; UNIQUE(page, row, col) enforced at DB |
| `tech_skills[]` + `soft_skills[]` as separate arrays | Enables precise recruiter filtering with `&&`; avoids full-text search complexity for skill matching |
| Scraped jobs as a separate pipeline | Scraper runs independently of the web server; DB is the handoff point; failure in scraper never affects the API |
| Category facet excludes active filter | `skip_category=True` in `_build_where` ensures all category tabs always show accurate counts regardless of which tab is selected |
| Smart keyword → filter detection | Client-side `detectFromQuery()` reduces friction — users who type "remote senior Python" see filters auto-highlighted without manual selection |
| Job description parser (client-side) | Scraper stores raw HTML/text; structured rendering is a display concern — no DB schema changes needed as parsing logic evolves |
| SlowAPI rate limits per route | Protects auth endpoints (5/min) and payment creation (20/min) without a Redis dependency |
| WebP conversion server-side | Consistent image format regardless of upload type; reduces CDN storage costs |
| AI Coaching isolated as its own service | LLM calls have unpredictable latency — isolated service prevents them from blocking the CRUD request pool |
| Background worker for notifications | Decouples email delivery from the HTTP response cycle |
| Prompt templates in DB, not code | Allows prompt iteration without redeployment; `is_active` flag enables swaps; version field tracks lineage alongside analysis records |
| Two-model OpenRouter strategy | classifier + parser use a cheap model (gpt-4o-mini) for cost; feature runs use a frontier model for quality — both env-configurable without code changes |
| Two-stage validation before feature run | Structural check catches wrong file types instantly (no LLM cost); classifier rejects non-resumes with high confidence before the expensive feature call runs |
| `safe_parse_json` multi-strategy extraction | LLMs prepend prose and wrap JSON in markdown fences; regex fence stripping + `{`…`}` substring fallback handles all observed output shapes without prompt changes |
| `max_tokens` feature-aware scaling | Recruiter and hiring_manager outputs include 15+ keywords + gap lists + plans; fixed token budgets caused truncated JSON; budget is now keyed by both word count and feature |
| Proactive JWT refresh (`scheduleRefresh`) | 15-minute access tokens expired mid-session causing 401 crashes; proactive refresh 60s before expiry with self-chaining keeps the token live for the full browser session |
| `resume_hash` + `resume_version` | SHA-256 of file bytes is the dedup key; version increments per user+hash allowing the same resume to be analyzed multiple times for different jobs while still tracking iteration history |
