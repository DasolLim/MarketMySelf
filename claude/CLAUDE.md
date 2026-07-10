# PixelHire — CLAUDE.md

Developer and AI-assistant reference for the PixelHire project. Read this before making any changes.

---

## Project Overview

**PixelHire** is a talent billboard platform where professionals purchase pixel sections to market themselves and get discovered by companies. It is not a job board — users own a section and present themselves visually, while companies browse and discover candidates directly.

**Business model:** One-time section purchase fee (no subscription). 9,000 total sections across 5 pages. Section price decreases by page (Page 1 = highest visibility = highest price).

---

## Architecture

```
pixelhire/
├── backend/          FastAPI + SQLAlchemy + Supabase (PostgreSQL) + Stripe
└── frontend/         Next.js 14.2.3 (App Router) + TypeScript
```

### Backend (`pixelhire/backend/`)

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app entry point, CORS, rate limiting |
| `models.py` | SQLAlchemy models: `User`, `PixelSection`, `Payment` |
| `routers/auth.py` | Register, login (Supabase Auth), JWT token issue |
| `routers/sections.py` | Grid data, section update, image upload |
| `routers/payments.py` | Stripe payment intent creation, history |
| `migrations/` | Alembic setup + raw SQL schema in `001_initial_schema.sql` |
| `.env` | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `STRIPE_SECRET_KEY`, `JWT_SECRET` |

**Run backend:**
```bash
cd pixelhire/backend
source venv/bin/activate      # always activate venv first
uvicorn main:app --reload --port 8000
```

Always use `python3` / `pip3`. The project uses Python 3.14 in the venv.

**Alembic migrations:**
```bash
alembic -c migrations/alembic.ini upgrade head
```
Note: `%` in DATABASE_URL passwords must be escaped as `%%` in `migrations/env.py`.

### Frontend (`pixelhire/frontend/`)

Next.js 14.2.3 — NOT v15. `params` in dynamic routes is a plain object, NOT a Promise. Never use `use(params)`.

**Run frontend:**
```bash
cd pixelhire/frontend
npm run dev
```

**Key directories:**

```
app/
├── page.tsx          Homepage (main marketing page)
├── about/page.tsx    Founder story + mission
├── contact/page.tsx  Contact with email link
├── login/page.tsx    Sign in form
├── register/page.tsx Registration form
├── dashboard/page.tsx Authenticated user dashboard
└── grid/[page]/      Full-screen talent billboard (pages 1–5)

components/
├── Navbar.tsx        Global nav (hidden on /grid/* routes)
├── SectionCard.tsx   Empty + Filled section card variants
├── SectionEditor.tsx Section edit form (for section owners)
├── SectionModal.tsx  Modal overlay wrapping SectionCard
├── PixelGrid.tsx     Interactive grid canvas for talent pages
└── ProfileCarousel.tsx Auto-rotating carousel of published profiles

lib/
├── auth-context.tsx  AuthProvider + useAuth() hook
└── api.ts            All fetch calls to backend
```

---

## Auth System

- Backend issues its own JWTs (not Supabase JWTs) after verifying credentials via Supabase Auth
- **Access token:** stored in React state (memory only) — never persisted
- **Refresh token:** stored in `localStorage` under key `ph_refresh`
- Session auto-restores on mount via `GET /auth/refresh`
- `useAuth()` provides: `{ accessToken, userId, isLoading, login, register, logout }`

**Auth-gated actions:** Unauthenticated users who click "Claim" are redirected to `/login` via `router.push("/login")` — implemented in both `app/page.tsx` and `app/grid/[page]/page.tsx`.

---

## Design System

### Philosophy
Business-formal, self-branding/marketing aesthetic. Clean, professional digital product. Think Linear, Vercel, Notion — dark, purposeful, with personality. Not "hacker terminal". Not generic SaaS.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#07080f` | Page background |
| `--bg-surface` | `#0c0f1d` | Cards, form containers |
| `--bg-elevated` | `#111627` | Elevated surfaces |
| `--indigo` | `#6366f1` | Primary CTA, buttons, active states, links |
| `--indigo-light` | `#818cf8` | Softer accent, hover states |
| `--indigo-faint` | `rgba(99,102,241,0.10)` | Card tints, badges |
| `--amber` | `#f59e0b` | Urgency, countdown, founder voice, "For Companies" |
| `--amber-faint` | `rgba(245,158,11,0.08)` | Amber card tints |
| `--text-1` | `#f0f2fa` | Primary text |
| `--text-2` | `#8492b8` | Secondary / body text |
| `--text-3` | `#4a5578` | Muted / captions |
| `--text-4` | `#232b42` | Dim / decorative |
| `--border` | `rgba(255,255,255,0.07)` | Default card borders |
| `--border-mid` | `rgba(255,255,255,0.12)` | Hover border |
| `--border-hover` | `rgba(255,255,255,0.20)` | Active/focused border |

**Category colors** (section cards only — not UI):

| Category | Color |
|----------|-------|
| Technical | `#22d3ee` (cyan) |
| Marketing | `#c084fc` (purple) |
| Finance | `#34d399` (green) |

The distinction matters: indigo drives UI; category colors drive product content. Never use category colors for buttons, links, or general UI elements.

### Typography

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| Primary (body, UI, labels) | `Inter` | 300–800 | System UI fallback |
| Brand / Logo only | `Chakra Petch` | 600–700 | Use sparingly — logo, grid page labels |
| Technical labels, monospace accents | `IBM Plex Mono` | 400–500 | Section IDs, stat labels, eyebrows |

**Type scale:**
- Hero H1: `clamp(40px, 6.5vw, 78px)`, weight 800, tracking `-0.035em`
- Section H2: `clamp(24px, 3.5vw, 44px)`, weight 700–800, tracking `-0.025em`
- Card H3: `18–22px`, weight 700, tracking `-0.015em`
- Body: `14–16px`, weight 400, line-height `1.7–1.85`
- Labels/eyebrows: `10–11px`, IBM Plex Mono, `0.12–0.18em` letter-spacing, uppercase

### Spacing
- Page horizontal padding: `clamp(20px, 5vw, 80px)`
- Section vertical padding: `80px` top/bottom (large sections), `clamp(64px, 9vh, 120px)` (about page)
- Card internal padding: `24–28px`
- Component gap: `12–16px` between cards, `24–32px` between sections

### Card Anatomy
Every card follows this pattern:
```
background: #0c0f1d
border: 1px solid rgba(255,255,255,0.07)
border-radius: 12–16px
[optional] top accent: 2px gradient line (color depends on context)
hover: border-color → rgba(255,255,255,0.16), transform: translateY(-1px)
transition: border-color 150ms, transform 150ms
```

Primary CTA cards additionally get: `boxShadow: 0 0 32px rgba(99,102,241,0.35)`

### Background Treatment
All pages use the same base:
```css
background: #07080f
/* Dot grid texture: */
backgroundImage: radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)
backgroundSize: 36px 36px
/* Ambient glow (top-center): */
radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 65%)
```

### Buttons

**Primary (solid indigo):**
```css
background: #6366f1
color: #fff
border-radius: 10px
padding: 12–14px 28–36px
font: Inter 600, 14–16px
box-shadow: 0 0 32px rgba(99,102,241,0.35)
hover: background #5254cc, translateY(-1px)
```

**Secondary (ghost):**
```css
background: transparent
border: 1px solid rgba(255,255,255,0.12)
color: #8492b8
hover: border rgba(255,255,255,0.25), color #f0f2fa
```

**Tertiary (text link):**
```css
color: #818cf8 or #8492b8
no border
hover: color brightens
```

### Animations

All keyframes are defined in `globals.css`:

| Keyframe | Usage |
|----------|-------|
| `fadeInUp` | Load-time content entry (staggered delay 0.1–0.4s) |
| `fadeIn` | Simple opacity entrance (badge, overlays) |
| `scaleIn` | Modal / success state pop-in |
| `float` | Decorative floating elements |
| `spin` | Loading spinner |
| `cell-pop` | Billboard cell entrance |
| `glow-pulse` | Live indicator dot on badges |

**Scroll animations:** `useFadeIn()` hook using `IntersectionObserver` — defined locally in each page file. Pattern:
```tsx
function useFadeIn(threshold = 0.12) { ... }
// Returns { ref, visible }
// Apply: style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)", transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)" }}
```

---

## Page Structure

### `/` — Homepage (`app/page.tsx`)
1. Hero (split layout: copy left, animated billboard preview right)
2. How It Works (3-step with IntersectionObserver fade)
3. For Who (2-column: Job Seekers / Companies)
4. ProfileCarousel (auto-rotating, 3 profiles per slide, 4s interval)
5. Pricing + Countdown timer (to `2026-07-01T00:00:00Z`)
6. Live grid preview (PixelGrid component, tabbed by page)
7. Final CTA card
8. Footer

### `/about` — About (`app/about/page.tsx`)
Scroll-narrative editorial page:
1. Hero (founder hook, ghost "INVISIBLE." text in background)
2. The Problem (asymmetric 2-col layout)
3. Founder Quote (blockquote, right-aligned)
4. The Turn ("So I built something different")
5. The Truth (amber-accented callout block)
6. What's Different (2×2 feature grid with per-feature accent color)
7. The Mission (ghost "SEEN." text in background)
8. For Companies + Final CTA

### `/contact` — Contact (`app/contact/page.tsx`)
Simple centered layout. Email card linking to `mybusinessemail@gmail.com`. Amber response-time badge.

### `/login` — Login (`app/login/page.tsx`)
Centered form card. Indigo focus rings on inputs. Spinner state on submit.

### `/register` — Register (`app/register/page.tsx`)
Centered form card. Feature pills above form (Personal profile, Company visibility, One-time fee). Success state shows email verification message.

### `/dashboard` — Dashboard (`app/dashboard/page.tsx`)
Protected (redirects to `/login` if unauthenticated). Account info card, empty sections state, quick links grid.

### `/grid/[page]` — Grid Pages (`app/grid/[page]/page.tsx`)
Full-screen immersive billboard. Navbar hidden on these routes. Floating HUDs (top-left: logo + page info; top-right: category counts; bottom: page nav). Auth-gate on Claim button.

---

## Navbar (`components/Navbar.tsx`)

- Fixed, 60px height, scroll-aware (more opaque + border on scroll)
- Hidden on `/grid/*` routes
- Logo: indigo gradient icon mark + "PixelHire" in Chakra Petch
- Center links: Home, About, Contact
- Right: Sign in + "Get started" (indigo) when logged out; Dashboard + Sign out when logged in
- "Get started" button uses indigo with glow shadow

---

## Key Constraints

- **Next.js version: 14.2.3** — do NOT use `use(params)`, `use(searchParams)`, or any Next.js 15+ APIs
- **Python: always `python3` / `pip3`** — venv uses Python 3.14
- **Alembic command:** `alembic -c migrations/alembic.ini upgrade head` (alembic.ini is inside migrations/)
- **No Redis** — removed from requirements.txt
- **CSP** in `next.config.mjs` allows: `http://localhost:8000`, `https://*.supabase.co`, `https://fonts.googleapis.com`, `https://fonts.gstatic.com`
- **Image domains:** Only `*.supabase.co` is allowed in `next.config.mjs` `images.remotePatterns`

---

## Styling Conventions

1. **Inline styles only** — this project uses React inline style objects throughout, no Tailwind classes for page layouts
2. **No comments in JSX** describing what code does — code should be self-evident
3. **Font references:** Always quote font names: `"'Inter', sans-serif"` not `Inter, sans-serif`
4. **Transitions:** Always use `150ms` for hover color/border; `0.65–0.7s cubic-bezier(0.16,1,0.3,1)` for entrance animations
5. **Hover effects:** Cards lift `translateY(-1px)` on hover — not shadow changes (shadow stays)
6. **Error states:** `rgba(239,68,68,0.08)` background, `rgba(239,68,68,0.22)` border, `#f87171` text
7. **Success states:** `rgba(52,211,153,0.08)` background, `rgba(52,211,153,0.22)` border, `#34d399` text
8. **Loading spinners:** `border-topColor: #6366f1` on a 16–18px element, `animation: spin 600ms linear infinite`
9. **`clamp()` for responsive type and spacing** — always prefer `clamp()` over fixed px for hero text and section padding
10. **`max-width: 1120px` for main content** — most page sections should be capped and centered at this width

---

## Anti-patterns to Avoid

- **No neon "hacker/terminal" aesthetic** — no cyan `#22d3ee` used for UI buttons, links, or page accents (category cards excepted)
- **No ALL CAPS body text** — uppercase only for short eyebrow labels in IBM Plex Mono
- **No side-stripe `border-left` accents** — use top-stripe `border-top: 2px solid` or full border
- **No `background-clip: text` gradients** — use solid colors for all text
- **No nested cards** — cards don't contain other cards
- **No generic SaaS icon grids** — differentiate section purposes with layout, not icons alone
- **No rounded `border-radius > 20px`** on large containers — max 16px for cards, 20px for CTA sections

---

## Content / Copy

- **Company contact email:** `mybusinessemail@gmail.com`
- **Hiring window opens:** July 1, 2026 (`2026-07-01T00:00:00Z`)
- **Grid:** 5 pages × 100 sections = 500 sections per page, 9,000 total (5 pages × ~1,800 described loosely)
- **Page prices:** Page 1: $10.00 / Page 2: $6.99 / Page 3: $5.00 / Page 4: $3.99 / Page 5: $2.99
- **Categories:** Technical (cyan `#22d3ee`), Marketing (purple `#c084fc`), Finance (green `#34d399`)
- **Brand tagline:** "Stop Applying. Start Being Found."
- **Product register:** `brand` (the design IS the product)
