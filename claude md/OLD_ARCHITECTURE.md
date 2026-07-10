# PixelHire — Architecture

> Talent billboard platform. Professionals purchase pixel sections to be discovered by companies.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                           │
│              Next.js 14 App Router · TypeScript · React 18          │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ REST (JSON) · Bearer JWT
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend                             │
│          Python 3.14 · SQLAlchemy 2 · Pydantic v2 · SlowAPI        │
└──────────┬─────────────────────────────┬────────────────────────────┘
           │ SQL (psycopg2)              │ SDK calls
           ▼                            ▼
┌──────────────────────┐   ┌────────────────────────────────────────┐
│  Supabase PostgreSQL │   │          Supabase Services             │
│  (auth.users)        │   │  Auth · Storage (profiles bucket)      │
│  public.users        │   └────────────────────────────────────────┘
│  public.pixel_       │
│    sections          │   ┌────────────────────────────────────────┐
│  public.payments     │   │              Stripe                    │
│  public.pixel_views  │   │  PaymentIntent · Webhooks              │
└──────────────────────┘   └────────────────────────────────────────┘
```

---

## Repository Layout

```
MarketMySelf/
├── CLAUDE.md               Project conventions and design system
├── ARCHITECTURE.md         This file
└── pixelhire/
    ├── backend/            FastAPI application
    └── frontend/           Next.js application
```

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
    │
    ▼
routers/              One module per resource
  auth.py             /auth/*
  sections.py         /sections/*  (read + update)
  images.py           /sections/{id}/image  (upload)
  payments.py         /payments/*
    │
    ├── schemas/       Pydantic v2 request/response models
    │   section.py
    │   payment.py
    │
    ├── models/        SQLAlchemy 2 ORM models
    │   base.py
    │   user.py
    │   section.py
    │   payment.py
    │
    ├── services/      Stateless business logic
    │   stripe_service.py    PaymentIntent creation + webhook verification
    │   storage.py           Supabase Storage upload/delete (singleton client)
    │   image_processor.py   Pillow: validate MIME, resize, convert → WebP
    │
    └── database.py    SQLAlchemy engine + session factory (pool_size=10)
```

### Entry Point (`main.py`)

| Concern | Implementation |
|---------|---------------|
| CORS | `allow_origins=[FRONTEND_URL]` — single explicit origin |
| Allowed methods | `GET POST PATCH DELETE` |
| Rate limiting | SlowAPI · per-route `@limiter.limit(...)` |
| Docs | `/docs` enabled in non-production only |
| DB health check | `engine.connect()` inside async lifespan |

### Routers & Endpoints

**`/auth`**

| Method | Path | Auth | Rate limit | Purpose |
|--------|------|------|-----------|---------|
| `POST` | `/auth/register` | — | 5/min | Create Supabase Auth user; returns 201 + verification prompt |
| `POST` | `/auth/token` | — | 10/min | `OAuth2PasswordRequestForm`; returns `access_token` + `refresh_token` |
| `POST` | `/auth/refresh` | — | — | Rotate both tokens from a valid refresh token |

JWT algorithm: `HS256`. Access token: 15 min (env `ACCESS_TOKEN_EXPIRE_MINUTES`). Refresh token: 30 days (env `REFRESH_TOKEN_EXPIRE_DAYS`). Subject (`sub`) is the Supabase `user_id` UUID string.

**`/sections`**

| Method | Path | Auth | Rate limit | Purpose |
|--------|------|------|-----------|---------|
| `GET` | `/sections/page/{page}` | — | 60/min | Full grid row for billboard rendering (lightweight `GridSectionResponse`) |
| `GET` | `/sections/{id}` | — | 120/min | Single section detail (`SectionResponse`) |
| `PATCH` | `/sections/{id}` | ✓ | 30/min | Update profile fields; enforces `owner_id == current_user` |
| `POST` | `/sections/{id}/image` | ✓ | 10/min | Multipart upload → process → Supabase Storage → update `image_url` |

**`/payments`**

| Method | Path | Auth | Rate limit | Purpose |
|--------|------|------|-----------|---------|
| `POST` | `/payments/intent` | ✓ | 20/min | Validate section is unclaimed; create Stripe PaymentIntent; persist `Payment(pending)` |
| `POST` | `/payments/webhook` | Stripe sig | — | `payment_intent.succeeded` → assign `owner_id`; `payment_failed` → mark failed |
| `GET` | `/payments/history` | ✓ | 30/min | User's payment records, descending by `created_at` |

**`GET /health`** — liveness probe, no auth.

### Models

**`User`** (`public.users`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | References `auth.users(id)` |
| `email` | `TEXT UNIQUE` | |
| `role` | `TEXT` | `'buyer'` or `'admin'` |
| `verified_at` | `TIMESTAMPTZ` | Set on email verification |
| `created_at` | `TIMESTAMPTZ` | Server default |

**`PixelSection`** (`public.pixel_sections`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | |
| `page_number` | `SMALLINT` | 1–3 (DB check constraint) |
| `row` | `SMALLINT` | 1–50 |
| `col` | `SMALLINT` | 1–60 |
| `owner_id` | `UUID FK → users` | `NULL` = available |
| `purchased_at`, `expires_at`, `price_paid` | | Set on purchase |
| `full_name`, `job_title`, `bio(300)` | | Profile content |
| `portfolio_url`, `job_category`, `skills[]` | | Profile content |
| `image_path`, `image_url`, `image_size_bytes` | | Storage reference |
| `nft_token_id`, `nft_contract_addr` | | Reserved / future |
| `is_published` | `BOOLEAN` | Controls public visibility |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | `updated_at` via trigger |

Unique constraint: `(page_number, row, col)`. Indexes on `page_number`, `owner_id`.

**`Payment`** (`public.payments`)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | |
| `user_id` | `UUID FK → users` | |
| `pixel_section_id` | `UUID FK → pixel_sections` | |
| `stripe_payment_intent_id` | `TEXT UNIQUE` | |
| `amount` | `NUMERIC(10,2)` | In dollars |
| `status` | `TEXT` | `pending → succeeded / failed` |

Indexes on `user_id`, `pixel_section_id`, `stripe_payment_intent_id`.

### Services

**`stripe_service.py`**

```
PAGE_PRICES = { 1: 1000¢, 2: 699¢, 3: 500¢ }

create_payment_intent(page_number, section_id, user_id)
  → stripe.PaymentIntent  (metadata carries section + user IDs)

verify_webhook(payload, sig_header)
  → stripe.Event  (raises 400 on invalid signature)
```

**`storage.py`**

Singleton Supabase client (service role). Bucket: `profiles` (env `SUPABASE_STORAGE_BUCKET`). Upload path pattern: `sections/{section_id}/{filename}`. Returns public CDN URL.

**`image_processor.py`**

Validates MIME type via `python-magic`. Resizes with Pillow. Outputs WebP bytes + a deterministic filename. Called before every `POST /sections/{id}/image`.

### Schemas (Pydantic v2)

**`SectionUpdateRequest`** — all fields optional (PATCH semantics):
- `full_name`, `job_title` — max 100 chars
- `bio` — max 300 chars
- `portfolio_url` — must start `https://`
- `job_category` — enum-validated against `{Technical, Marketing, Finance}`
- `skills` — max 5 items, each trimmed to 50 chars
- `is_published` — bool

**`GridSectionResponse`** — lightweight projection for grid rendering (id, page, row, col, owner_id, full_name, job_title, image_url, job_category, is_published).

**`SectionResponse`** — full section detail.

### Database

```
# Engine
pool_pre_ping=True   (stale connection recovery)
pool_size=10
max_overflow=20

# Session
get_db() → generator; always closes in finally
```

Migrations managed with **Alembic** (`migrations/alembic.ini`). Raw bootstrap SQL in `migrations/001_initial_schema.sql` — includes RLS policies, triggers, and seed insert.

### Middleware

`SlowAPI` rate limiter keyed on `get_remote_address`. Limits declared per-route with `@limiter.limit("N/period")`. Returns `429` JSON `{"detail": "Rate limit exceeded: ..."}`.

### Environment Variables (backend)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (escape `%` as `%%` in Alembic env.py) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for Auth admin + Storage |
| `STRIPE_SECRET_KEY` | Stripe secret |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `JWT_SECRET` | HS256 signing secret |
| `FRONTEND_URL` | Allowed CORS origin (default: `http://localhost:3000`) |
| `ENVIRONMENT` | `production` disables `/docs` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Default: `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Default: `30` |
| `SUPABASE_STORAGE_BUCKET` | Default: `profiles` |

### Running the Backend

```bash
cd pixelhire/backend
source venv/bin/activate          # Python 3.14 venv
uvicorn main:app --reload --port 8000

# Migrations
alembic -c migrations/alembic.ini upgrade head
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
| Drag/upload | `react-dropzone`, `react-image-crop` |

### Directory Structure

```
app/
├── layout.tsx              Root layout — AuthProvider, Navbar, global fonts
├── globals.css             CSS variables, keyframe animations, resets
├── page.tsx                / — Homepage (7 sections + footer)
├── about/page.tsx          /about — Scroll-narrative editorial
├── contact/page.tsx        /contact — Email card
├── login/page.tsx          /login — Sign-in form
├── register/page.tsx       /register — Registration + success state
├── dashboard/page.tsx      /dashboard — Auth-protected user hub
└── grid/[page]/page.tsx    /grid/1–5 — Full-screen billboard

components/
├── Navbar.tsx              Fixed 60px nav; hidden on /grid/* routes
├── PixelGrid.tsx           Interactive grid canvas (billboard pages)
├── SectionCard.tsx         Empty + filled section card variants
├── SectionModal.tsx        Modal overlay wrapping SectionCard
├── SectionEditor.tsx       Owned-section edit form
├── ProfileCarousel.tsx     Auto-rotating carousel (3 profiles, 4s interval)
└── ImageUpload.tsx         Dropzone + crop UI for profile image

lib/
├── api.ts                  All fetch() calls to backend REST API
├── auth-context.tsx        AuthProvider + useAuth() hook
├── stripe.ts               Stripe.js client initialisation
└── supabase.ts             Supabase client (browser-side, anon key)

types/
└── index.ts                Shared TypeScript interfaces + constants
```

### Routing

| Route | File | Auth required |
|-------|------|--------------|
| `/` | `app/page.tsx` | No |
| `/about` | `app/about/page.tsx` | No |
| `/contact` | `app/contact/page.tsx` | No |
| `/login` | `app/login/page.tsx` | No |
| `/register` | `app/register/page.tsx` | No |
| `/dashboard` | `app/dashboard/page.tsx` | Yes → redirect `/login` |
| `/grid/[page]` | `app/grid/[page]/page.tsx` | Claim action gated; browse is open |

`params` in `/grid/[page]` is a plain object (Next.js 14 — not a Promise, never use `use(params)`).

### Auth Flow

```
Mount
  └─ localStorage.getItem("refresh_token")
       └─ POST /auth/refresh
            ├─ success → accessToken in React state, userId decoded from JWT sub
            └─ failure → clear localStorage

Login
  └─ POST /auth/token (form-encoded username/password)
       └─ accessToken → React state (memory only, never persisted)
          refresh_token → localStorage["refresh_token"]

Logout
  └─ clear state + localStorage

useAuth() exposes: { accessToken, userId, isLoading, login, register, logout }
```

Access token is intentionally kept in memory only (XSS protection). Refresh token in localStorage is the persistence layer.

### API Client (`lib/api.ts`)

Central `request<T>()` wrapper over `fetch`. Base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:3000` at build time, `http://localhost:8000` at runtime). Auth calls pass `Authorization: Bearer {accessToken}`. Image upload sends `FormData` directly (bypasses `Content-Type: application/json` header).

### Type System (`types/index.ts`)

| Type | Purpose |
|------|---------|
| `PixelSection` | Full section detail from `GET /sections/{id}` |
| `GridSection` | Lightweight projection for grid rendering |
| `Payment` | Payment record |
| `SectionUpdatePayload` | PATCH body |
| `JobCategory` | `"Technical" \| "Marketing" \| "Finance"` |
| `PaymentStatus` | `"pending" \| "succeeded" \| "failed" \| "refunded"` |
| `PAGE_PRICES` | `Record<1\|2\|3\|4\|5, number>` — prices in dollars |
| `CATEGORY_COLORS` | Tailwind class map per category |
| `GRID_ROWS / GRID_COLS` | `10 × 10 = 100` sections per frontend page display |

### Security Headers (`next.config.mjs`)

Applied globally on all routes:

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
  email, role, verified_at, created_at

public.pixel_sections  ← 9,000 rows pre-seeded (3 pages × 60 cols × 50 rows)
  id, page_number, row, col          (unique constraint)
  owner_id FK → users                (NULL = available)
  purchased_at, expires_at, price_paid
  full_name, job_title, bio, portfolio_url, job_category, skills[]
  image_path, image_url, image_size_bytes, image_uploaded_at
  nft_token_id, nft_contract_addr    (reserved)
  is_published, created_at, updated_at

public.payments
  id, user_id FK, pixel_section_id FK
  stripe_payment_intent_id (unique), amount, status, created_at

public.pixel_views     ← analytics (insert-only via RLS)
  id, pixel_section_id FK, viewer_ip_hash, viewed_at
```

**Row Level Security** is enabled on all four tables. Key policies:
- `users`: each user reads/updates only their own row
- `pixel_sections`: public can read `is_published=true` and unowned sections; owners can read/update their own
- `payments`: users see only their own payments
- `pixel_views`: insert allowed for all; select restricted to section owner

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

## Data Flow: Image Upload

```
1. POST /sections/{id}/image  (multipart, auth required)
2. image_processor.process_and_validate_image(file)
   ├─ Validate MIME type (python-magic)
   ├─ Resize with Pillow
   └─ Return WebP bytes + filename
3. If section.image_path exists → delete_profile_image() from Storage
4. upload_profile_image(section_id, filename, webp_bytes)
   └─ Supabase Storage: profiles/sections/{id}/{filename}
5. section.image_path = storage path
   section.image_url  = public CDN URL
   section.image_size_bytes = len(bytes)
```

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Backend issues its own JWTs (not Supabase JWTs) | Decouples session management from Supabase; allows custom expiry and refresh rotation |
| Access token in memory only | Eliminates XSS token theft via localStorage |
| Supabase Auth as identity provider only | Backend calls `auth.admin.create_user` and `sign_in_with_password`; session lives in FastAPI layer |
| Sections pre-seeded at migration time | Grid reads are simple `SELECT` with no existence checks; `UNIQUE(page, row, col)` enforced at DB |
| SlowAPI rate limits per route | Protects auth endpoints (5/min) and payment creation (20/min) without a Redis dependency |
| Pydantic v2 field validators on `SectionUpdateRequest` | Input sanitised at the API boundary — max lengths, HTTPS enforcement, skills capped at 5 |
| SQLAlchemy engine `pool_pre_ping=True` | Recovers from idle connection drops without surfacing errors to users |
| WebP conversion server-side | Consistent image format regardless of what the user uploads; reduces CDN storage costs |
