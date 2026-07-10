# PixelHire

> **Stop Applying. Start Being Found.** — A talent-billboard platform where professionals buy a pixel section to market themselves, and companies discover candidates directly instead of sifting through résumés.

PixelHire flips the job-board model: instead of applying into the void, users own a visual section on a 9,000-cell billboard and present themselves as a brand. On top of the marketplace sits an **AI career-coaching suite** and a **distributed job-ingestion pipeline** that aggregates and searches listings from 18 sources.

<p align="left">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14.2-000000?logo=nextdotjs&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white">
  <img alt="Elasticsearch" src="https://img.shields.io/badge/Elasticsearch-8.x-005571?logo=elasticsearch&logoColor=white">
  <img alt="Stripe" src="https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white">
  <img alt="Claude" src="https://img.shields.io/badge/Anthropic-Claude-D97757?logo=anthropic&logoColor=white">
</p>

---

## Highlights

- **Full-stack, service-oriented monorepo** — a FastAPI backend, a Next.js 14 (App Router) frontend, and a standalone async job-scraping microservice, each independently deployable.
- **Custom JWT auth with role-based access control** — the backend issues and verifies its own HS256 tokens layered over Supabase Auth, gating routes by role (talent / recruiter) via dependency-injected guards.
- **AI career-coaching suite** — résumé analysis, cover-letter generation, and interview-prep question generation backed by **Anthropic Claude**, with **OpenRouter multi-model routing** (frontier vs. cost-optimized models) and PDF/DOCX text extraction + PDF export.
- **Distributed job-ingestion pipeline** — async scrapers across **18 sources** feed a normalize → deduplicate → index flow into **Elasticsearch**, with Playwright-based anti-detection and a scheduler.
- **Stripe integration** — one-time section purchases and recurring subscriptions with webhook handling.
- **Production concerns baked in** — rate limiting, CORS allow-listing, input sanitization (`bleach`), CSP headers, and Alembic-managed migrations.

---

## Architecture

```
MarketMySelf/
├── pixelhire/
│   ├── backend/        FastAPI · SQLAlchemy 2.0 · Supabase (PostgreSQL) · Stripe · Claude
│   │   ├── routers/    auth · sections · payments · subscriptions · jobs · applications
│   │   │               search · profile · ai_coaching · scraped_jobs · images
│   │   ├── models/     SQLAlchemy ORM models (users, sections, payments, coaching, …)
│   │   ├── schemas/    Pydantic v2 request/response validation
│   │   ├── services/   Business logic (AI coaching, resume, cover letter, interview,
│   │   │               Stripe, search, storage, image processing)
│   │   ├── middleware/ Rate limiting (slowapi) · role-based auth guard (JWT)
│   │   └── migrations/ Alembic
│   │
│   └── frontend/       Next.js 14.2 · TypeScript · React 18
│       ├── app/        Talent billboard, dashboard, recruiter portal, coaching, pricing
│       ├── components/ Grid, résumé upload, job cards, search filters, notifications
│       └── lib/        API client, auth context, Supabase & Stripe clients
│
└── job_scraper/        Standalone async Python microservice
    ├── scraper/
    │   ├── adapters/       18 source adapters (Indeed, LinkedIn, Glassdoor, Dice,
    │   │                   ZipRecruiter, Wellfound, Google Jobs + raw API feeds)
    │   ├── anti_detect/    Proxy pool · request throttling · browser profiles
    │   ├── normalizer.py   Per-source → canonical schema
    │   ├── deduplicator.py Content-hash + fuzzy matching (rapidfuzz)
    │   ├── es_*.py         Elasticsearch client, indexing & search
    │   └── scheduler.py    Recurring ingestion
    └── tests/              pytest + pytest-asyncio suite
```

---

## Tech Stack

### Backend — `pixelhire/backend`
| Concern | Technology |
|---|---|
| API framework | **FastAPI** (async), Uvicorn |
| ORM & migrations | **SQLAlchemy 2.0**, Alembic |
| Database | **PostgreSQL** via **Supabase** (`psycopg2`) |
| Validation | **Pydantic v2** |
| Auth | Custom **JWT** (`python-jose`), `passlib`/bcrypt, Supabase Auth |
| Payments | **Stripe** (payment intents, subscriptions, webhooks) |
| AI / LLM | **Anthropic Claude**, **OpenRouter** (multi-model routing) |
| Document processing | `pdfplumber`, `python-docx`, `reportlab` (PDF gen), Pillow |
| Hardening | `slowapi` rate limiting, `bleach` sanitization, CORS allow-list |

### Frontend — `pixelhire/frontend`
| Concern | Technology |
|---|---|
| Framework | **Next.js 14.2** (App Router), **React 18** |
| Language | **TypeScript 5.4** |
| State/Auth | React Context (`useAuth`), memory access token + refresh rotation |
| Payments | `@stripe/stripe-js` |
| Media | `react-dropzone`, `react-image-crop` |
| Styling | Design-token system (inline styles), custom CSS animations |

### Job Scraper — `job_scraper`
| Concern | Technology |
|---|---|
| Runtime | **async Python** (`httpx`, `asyncpg`) |
| Scraping | **Playwright** + `playwright-stealth`, BeautifulSoup / lxml |
| Search & storage | **Elasticsearch 8.x**, PostgreSQL |
| Dedup / cleaning | `rapidfuzz`, `ftfy` |
| Config | `pydantic-settings` |
| Testing | `pytest`, `pytest-asyncio`, `respx` |

---

## Backend — Deep Dive

Python 3.14 · FastAPI · SQLAlchemy 2.0 · PostgreSQL · demonstrating API design, relational modeling, auth, and production hardening.

### Routing & API design
- **Modular router architecture** — 11 versioned `APIRouter` modules (`auth`, `sections`, `payments`, `subscriptions`, `jobs`, `scraped_jobs`, `applications`, `search`, `profile`, `ai_coaching`, `images`), each mounted with its own prefix and OpenAPI tag and composed in `main.py`.
- **RESTful semantics** — correct verbs (`GET`/`POST`/`PATCH`/`DELETE`), explicit status codes (`201 Created`, `429`, `403`), and resource-oriented paths with typed path/query parameters (e.g. `PATCH /coaching/interview-prep/sessions/{session_id}`).
- **Layered separation of concerns** — thin routers delegate to a `services/` layer for business logic, validate through **Pydantic v2** `schemas/`, and persist via SQLAlchemy `models/`. Auto-generated, environment-gated **Swagger/OpenAPI** docs (disabled in production).
- **Async-first** — endpoints and the job pipeline are `async`, backed by connection pooling for concurrent throughput.

### Authentication & authorization
- **Layered identity** — credentials are verified against **Supabase Auth**, but the backend mints and validates its **own HS256 JWTs**, decoupling the API's session model from the provider.
- **Access/refresh token rotation** — short-lived access tokens (15 min) paired with long-lived refresh tokens (30 days); `POST /auth/refresh` re-issues the pair and re-reads the user's current role on every refresh.
- **Role-based access control (RBAC)** — the signed token carries a `role` claim (`seeker` / `recruiter`); a reusable `require_role(*roles)` dependency guards recruiter-only routes and returns `403` on mismatch.
- **Secure credential handling** — bcrypt via `passlib`; registration uses the anon key to preserve the email-verification flow (a deliberate choice — the service key would auto-confirm and skip verification); password changes re-authenticate the current password before applying via the admin API.

### Middleware & hardening
- **Per-endpoint rate limiting** — `slowapi` with granular limits (`5/min` on register/change-password, `10/min` on login) and a custom `429` JSON handler.
- **Strict CORS** — explicit origin allow-list, method whitelist, and a curated header set (including `stripe-signature` for webhook verification).
- **Input sanitization** — user-supplied HTML scrubbed with `bleach`; CSP headers enforced at the edge.
- **Secrets discipline** — all keys via environment; access tokens never persisted server-side.

### Data & persistence (SQL / PostgreSQL)
- **SQLAlchemy 2.0** modern `DeclarativeBase` ORM over Supabase-managed **PostgreSQL**.
- **Tuned connection pool** — `pool_pre_ping`, `pool_size=10`, `max_overflow=20`, with a request-scoped `get_db` session dependency ensuring deterministic cleanup.
- **Relational schema** — 14 models (`User`, `PixelSection`, `Payment`, `Subscription`, `JobPost`, `Application`, `ScrapedJob`, `CoachingSession`, `ResumeAnalysis`, `CoverLetter`, `InterviewPrep`, `Notification`, `PromptTemplate`) using **UUID primary keys**, schema-qualified tables, timezone-aware timestamps, and DB-side `server_default` values.
- **Versioned migrations** — schema managed with **Alembic**.

### AI integration
- **Provider abstraction** — a service layer wraps both the native **Anthropic Claude SDK** and **OpenRouter**, with **multi-model routing** that selects a frontier model (`claude-sonnet-4`) for high-value tasks and a cost-efficient model (`gpt-4o-mini`) for cheaper ones — a real cost/quality tradeoff.
- **Document pipeline** — résumés are ingested from PDF/DOCX (`pdfplumber`, `python-docx`), analyzed by the LLM, and generated artifacts (cover letters) are rendered back to PDF with `reportlab`.
- **Persisted sessions** — every analysis, question set, and generated answer is stored and exposed through history endpoints.

---

## Frontend — Deep Dive

Next.js 14 (App Router) · TypeScript · React 18 · demonstrating typed data access, complex authenticated UX, and full-stack integration.

### Typed, full-stack API layer
- A **650-line strongly-typed API client** (`lib/api.ts`) is the single boundary to the backend: a generic `request<T>()` wrapper centralizes base URL, JSON handling, and error propagation; helpers compose `authHeaders(token)` and `buildQuery()` for type-safe query strings; `FormData` used for multipart image/résumé uploads.
- **Auth context** (`useAuth`) keeps the access token in memory only, persists the refresh token, and auto-restores the session on mount — mirroring the backend's rotation model on the client.

### Real-time job discovery
- **Continuously ingested listings** — job postings are sourced by the standalone async scraper (18 providers), normalized, deduplicated, and indexed into **Elasticsearch**, then served to the UI through `GET /scraped-jobs/search`.
- **Faceted search UX** — `JobSearchFilters` drives multi-dimensional queries (query text, work type, experience level, employment type, skills, salary range, location) that map directly onto Elasticsearch facets for fast, relevance-ranked results.
- **First-party postings too** — recruiters create/update/delete their own listings (`/jobs`), rendered alongside aggregated jobs via reusable `JobListingCard` / `ScrapedJobCard` components.

### AI-powered user dashboard
The authenticated dashboard (`/dashboard`) surfaces the AI coaching suite end-to-end:
- **Résumé analysis** — drag-and-drop upload (`react-dropzone`) → backend extraction + LLM analysis → structured feedback with saved history.
- **Cover-letter generator** — profile + job context → tailored letter with a configurable writing style, exportable to PDF.
- **Interview prep** — generates targeted question sets, captures user answers, and produces AI model answers, all tracked across persisted sessions.
- Each feature is a typed request/response round-trip through the API client, with loading, success, and error states styled from a shared design-token system.

### Role-aware, component-driven UI
- **Two experiences from one app** — a **seeker** dashboard (profile builder, applications, coaching) and a **recruiter portal** (`/recruiter` — talent search, job posting, candidate hiring), gated by the role claim.
- **Reusable component library** — `TalentCard`, `ApplicationList`, `JobPostForm`, `SearchFilters`, `ResumeUpload`, `NotificationBadge`, `SubscriptionBadge`, and an interactive image cropper (`react-image-crop`).
- **Interactive talent billboard** — the pixel-grid canvas with modal editors, plus **Stripe Checkout** (`@stripe/stripe-js`) for one-time section purchases and recurring subscriptions.
- **Notifications** — recruiters message candidates; unread state is surfaced through a reusable count badge and read/unread endpoints.

---

## Getting Started

### Backend
```bash
cd pixelhire/backend
python3 -m venv venv && source venv/bin/activate
pip3 install -r requirements.txt
alembic -c migrations/alembic.ini upgrade head
uvicorn main:app --reload --port 8000        # docs at http://localhost:8000/docs
```

### Frontend
```bash
cd pixelhire/frontend
npm install
npm run dev                                   # http://localhost:3000
```

### Job Scraper
```bash
cd job_scraper
python3 -m venv .venv && source .venv/bin/activate
pip3 install -r requirements.txt
playwright install
python3 cli.py --help
```

Each service reads configuration from its own `.env` (database URL, Supabase keys, Stripe keys, JWT secret, and LLM API keys).

---

## Engineering Notes

- **Separation of concerns** — routers stay thin; business logic lives in `services/`, validation in `schemas/`, persistence in `models/`. The scraper is fully decoupled from the web app and communicates through the shared datastore.
- **Resilient ingestion** — Elasticsearch failures never block the scrape pipeline; indexing is best-effort while PostgreSQL remains the source of truth.
- **Security-first defaults** — role-scoped JWT guards, per-route rate limits, HTML sanitization on user input, strict CORS/CSP, and access tokens kept out of persistent storage.

---

<sub>Built as a full-stack portfolio project demonstrating end-to-end product engineering — API design, relational data modeling, third-party integrations (Stripe, Supabase, LLM providers), async data pipelines, and modern React.</sub>
