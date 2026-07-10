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

## Core Features

**Talent billboard** — 9,000 purchasable pixel sections across 5 pages, priced by visibility tier. Owners edit their section with profile content, links, and imagery; companies browse and discover directly.

**AI career coaching**
- *Résumé analysis* — structured, actionable feedback on clarity, impact, and skills presentation.
- *Cover-letter generation* — tailored letters from a profile + job context, exportable to PDF.
- *Interview prep* — role- and skill-targeted behavioral, technical, and situational questions.
- Multi-model LLM routing selects frontier vs. cost-efficient models per task.

**Job discovery** — aggregated, normalized, deduplicated listings from 18 sources, queryable through faceted Elasticsearch search (work type, experience level, employment type, skills, salary, location).

**Recruiter portal** — role-gated views for browsing talent, posting jobs, and managing candidates.

**Payments & subscriptions** — Stripe-powered one-time section purchases and recurring plans.

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
