# Deploying MarketMySelf to Vercel

This repo deploys as **two separate Vercel projects** from the same GitHub repo:

| Project | Root Directory | Framework | Serves |
|---|---|---|---|
| `marketmyself-frontend` | `frontend` | Next.js | The web app |
| `marketmyself-backend` | `backend` | Other (Python) | The FastAPI API (serverless) |

The backend has been adapted for Vercel's Python serverless runtime:
- `backend/api/index.py` exposes the FastAPI ASGI `app`; `backend/vercel.json` rewrites all routes to it.
- `backend/database.py` uses `NullPool` when running on Vercel (env `VERCEL` is set automatically).
- `python-magic` (needs native `libmagic`) was removed — image type validation now uses Pillow.

> You run the commands below — deployment needs an interactive Vercel login, which can't be done from the assistant session.

---

## 0. One-time prerequisites

```bash
npm i -g vercel
vercel login
```

Have these ready (from your local `.env` files — see `backend/.env.example` and `frontend/.env.example`):
- Supabase URL + keys (anon/publishable **and** service role), storage bucket name
- Supabase **transaction pooler** connection string (port `6543`) — Supabase Dashboard → Project → Connect → "Transaction pooler"
- Stripe secret key + (later) webhook signing secret, Stripe publishable key
- `JWT_SECRET`, OpenRouter API key

---

## 1. Deploy the backend first

The frontend needs the backend URL, so deploy the API first.

```bash
cd backend
vercel link          # create/link a new project, e.g. "marketmyself-backend"
```

Set environment variables (Production) — either in the **dashboard** (Settings → Environment Variables) or via CLI:

```bash
# example; repeat for each key in backend/.env.example
vercel env add DATABASE_URL production          # paste the port-6543 POOLER string
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
vercel env add SUPABASE_STORAGE_BUCKET production
vercel env add JWT_SECRET production
vercel env add STRIPE_SECRET_KEY production
vercel env add OPENROUTER_API_KEY production
vercel env add ENVIRONMENT production           # value: production
# FRONTEND_URL is set in step 3 (after the frontend exists)
```

Deploy:

```bash
vercel --prod
```

Note the resulting URL, e.g. `https://marketmyself-backend.vercel.app`. Verify:

```bash
curl https://marketmyself-backend.vercel.app/health     # -> {"status":"ok"}
```

> `/docs` is disabled because `ENVIRONMENT=production` (by design).

---

## 2. Run database migrations (once, from your machine)

Migrations do **not** run on Vercel. Point Alembic at the production DB and upgrade:

```bash
cd backend
source venv/bin/activate                 # recreate the venv first if needed (see note at bottom)
DATABASE_URL='<your direct db url, port 5432>' alembic -c migrations/alembic.ini upgrade head
```

Use the **direct** connection (port 5432) for migrations, not the pooler.

---

## 3. Deploy the frontend

```bash
cd ../frontend
vercel link          # new project, e.g. "marketmyself-frontend"

vercel env add NEXT_PUBLIC_API_URL production               # value: https://marketmyself-backend.vercel.app
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

vercel --prod
```

Note the frontend URL, e.g. `https://marketmyself.vercel.app`.

---

## 4. Wire the two together (CORS) and redeploy the backend

```bash
cd ../backend
vercel env add FRONTEND_URL production      # value: https://marketmyself.vercel.app  (no trailing slash)
vercel --prod
```

`backend/main.py` reads `FRONTEND_URL` to build the CORS allow-list, so the browser can call the API.

---

## 5. Stripe webhook

In the Stripe Dashboard → Developers → Webhooks, add an endpoint:

```
https://marketmyself-backend.vercel.app/payments/webhook
```

Copy its signing secret and set it on the backend, then redeploy:

```bash
vercel env add STRIPE_WEBHOOK_SECRET production
vercel --prod
```

---

## Serverless caveats (already accounted for, but good to know)

- **Cold starts** — the Python function sleeps when idle; the first request after a lull is slower.
- **Request body limit ~4.5 MB** — image uploads are capped at 500 KB, but very large résumé PDFs could hit this.
- **Rate limiting is per-instance** — `slowapi` uses in-memory counters, so limits aren't shared across concurrent serverless instances (fine for a portfolio; use Redis/Upstash if you need global limits).
- **Python version** — Vercel runs Python 3.12 (not the 3.14 used locally); the code is compatible.
- **Connections** — always use the Supabase **pooler** (6543) for `DATABASE_URL` on Vercel; the app already switches to `NullPool` there.

## Alternative: deploy from the Vercel dashboard (no CLI)

For each project: **Add New → Project → import `DasolLim/MarketMySelf`**, set **Root Directory** to `backend` (or `frontend`), add the environment variables, and deploy. Same env vars as above.

---

## Note: recreate the backend venv

The local `backend/venv` broke when the project was flattened (it hard-codes the old path). To run migrations or the API locally:

```bash
cd backend
rm -rf venv && python3 -m venv venv && source venv/bin/activate
pip3 install -r requirements.txt
```
