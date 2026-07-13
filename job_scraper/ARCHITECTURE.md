# Job Scraper — Architecture

## Goal

Feed the PixelHire platform with fresh, real-world job postings so that
professionals on the billboard know which roles are actively being hired for.
The scraper pulls listings from 9 sources (API providers and direct scrapers),
stores the complete raw response as JSONB in Supabase, normalizes and
deduplicates those rows into a clean `scraped_jobs` table, and exposes a search
layer to the PixelHire backend.

**Status:** Phase 1 (raw ingestion) and Phase 2 (normalization) are complete.
Phase 3 (search API) is next.

---

## Directory Layout

```
job_scraper/
├── cli.py                         Entry point — two subcommands: fetch-raw, normalize
├── config.py                      Pydantic-settings environment config
├── requirements.txt               Python dependencies
├── .env                           API keys and database URL (never committed)
├── pytest.ini                     Test configuration
│
├── scraper/
│   │
│   ├── raw/                       ← Phase 1: raw ingestion pipeline
│   │   ├── runner.py              Fan-out orchestrator (asyncio.gather → storage)
│   │   ├── storage.py             asyncpg → raw_jobs + scrape_runs tables
│   │   ├── anti_detect.py         Shared jitter throttle + header rotation
│   │   │
│   │   └── sources/               One module per source — all return list[dict]
│   │       ├── dice.py            Dice — curl_cffi + RSC push-chunk parser
│   │       ├── serpapi.py         SerpAPI → Google Jobs aggregator
│   │       ├── jsearch.py         JSearch via RapidAPI
│   │       ├── adzuna.py          Adzuna REST API
│   │       ├── himalayas.py       Himalayas public JSON API
│   │       ├── remoteok.py        RemoteOK public JSON API
│   │       ├── remotive.py        Remotive public JSON API
│   │       ├── jobicy.py          Jobicy public JSON API
│   │       └── hn_hiring.py       HN "Who is Hiring?" via Algolia + Firebase
│   │
│   ├── models.py                  ScrapedJob dataclass (normalized schema)
│   ├── normalizer.py              Pure normalization functions (no I/O)
│   ├── deduplicator.py            SHA-256 content_hash + in-run dedup
│   ├── runner.py                  Phase 2 pipeline orchestrator
│   ├── storage.py                 scraped_jobs upsert + search helpers
│   ├── scheduler.py               Keyword-bucket loop scheduler (Phase 3+)
│   │
│   ├── adapters/                  ← Phase 2: per-source raw→ScrapedJob adapters
│   │   ├── __init__.py            ALL_RAW_ADAPTERS registry
│   │   ├── base.py                BaseAdapter ABC
│   │   ├── raw_dice.py
│   │   ├── raw_serpapi.py
│   │   ├── raw_jsearch.py
│   │   ├── raw_adzuna.py
│   │   ├── raw_himalayas.py
│   │   ├── raw_remoteok.py
│   │   ├── raw_remotive.py
│   │   ├── raw_jobicy.py
│   │   └── raw_hn_hiring.py
│   │   (legacy Playwright adapters also present on disk — unused)
│   │
│   └── anti_detect/               Shared detection-avoidance primitives
│       ├── browser_profile.py     Stealth Chromium context (UA, viewport, locale)
│       ├── proxy_pool.py          Rotating proxy pool with failure eviction
│       └── throttle.py            Per-domain rate limiter with jitter + back-off
│
└── tests/
    ├── conftest.py
    ├── test_normalizer.py         85 tests — pure functions, no network/DB
    └── test_deduplicator.py
```

---

## Phase 1 — Raw Ingestion Pipeline

### Code Flow

```
cli.py fetch-raw
  └── scraper/raw/runner.py :: run_raw(query, sources, write_db)
        ├── asyncio.gather() — all sources run concurrently
        │     └── source.fetch(query) → list[dict]  (raw, unnormalized)
        └── if write_db:
              scraper/raw/storage.py :: insert_raw(items, source, query_params)
                ├── INSERT INTO scrape_runs → run_id
                ├── INSERT INTO raw_jobs (one row per item)
                └── UPDATE scrape_runs SET status, jobs_fetched, jobs_inserted
```

### Sources (9 total)

#### API Sources — require keys, return clean JSON

| Source | Endpoint | Key(s) in `.env` | Jobs/run |
|--------|----------|-----------------|---------|
| **SerpAPI** | `serpapi.com/search.json` — Google Jobs aggregator (LinkedIn, Indeed, Glassdoor) | `SERPAPI_KEY` | ~10 |
| **JSearch** | `jsearch.p.rapidapi.com/search` — same aggregator, gap-filler | `JSEARCH_KEY` | ~10 |
| **Adzuna** | `api.adzuna.com/v1/api/jobs/us/search` — US job market, unlimited free | `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` | ~50 |

Sources without keys configured log a skip message and return an empty list — they never crash the run.

#### Direct Scrapers — no keys, public endpoints

| Source | Method | Jobs/run |
|--------|--------|---------|
| **Dice** | `curl_cffi` Chrome-impersonated GET of Next.js HTML → RSC push-chunk parser | ~22 |
| **Himalayas** | `httpx` GET → `himalayas.app/jobs/api` JSON | ~20 |
| **RemoteOK** | `httpx` GET → `remoteok.com/api` JSON | ~98 |
| **Remotive** | `httpx` GET → `remotive.com/api/remote-jobs` JSON | ~19 |
| **Jobicy** | `httpx` GET → `jobicy.com/api/v2/remote-jobs` JSON | ~9 |
| **HN Hiring** | Algolia search → latest "Who is Hiring?" thread → HN Firebase API → top-level comments (20 concurrent fetches) | ~60 |

#### Skipped / Not viable

| Source | Reason |
|--------|--------|
| Wellfound | GraphQL endpoint requires multiple rotating session tokens + CSRF; cookie alone returns 403 |
| RareRoles | Server drops all TCP connections (geo-block or offline); not a code issue |
| StillHiring | Data lives in an Airtable iframe — inaccessible without JS rendering |

---

### Anti-Detection Layer (`scraper/raw/anti_detect.py`)

#### Method 1 — curl_cffi TLS Impersonation (Dice only)

Dice is the only source that serves HTML through a CDN with bot detection.
`httpx` has a distinctly non-browser TLS fingerprint that Cloudflare and
similar WAFs catch at the network layer before any HTTP headers are inspected.

`curl_cffi` with `impersonate="chrome124"` replaces the TLS handshake at the
C level with Chrome 124's exact fingerprint:

```python
async with AsyncSession(impersonate="chrome124") as session:
    resp = await session.get(url, headers=headers, timeout=30)
```

Not applied to API sources — keyed REST APIs and public JSON endpoints don't
fingerprint at the TLS layer.

#### Method 2 — Jitter Delay + User-Agent Rotation (all direct scrapers)

`DomainThrottle.wait(domain, base_seconds)` applies:
- `asyncio.Semaphore(max_concurrent=1)` — one in-flight request per domain
- `sleep(random.uniform(base, base * 2))` — jittered delay

Rate floors: Dice 2.0s, RemoteOK 2.0s, Himalayas/Remotive/Jobicy 1.5s.

`random_ua()` picks a random User-Agent from 5 real browser strings on every
request (Chrome 124 macOS/Windows, Chrome 123 macOS, Firefox 125, Safari 17).

---

### Database Schema — Phase 1

#### `raw_jobs` — one row per job item

```sql
id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
source           TEXT NOT NULL,           -- "dice" | "serpapi" | "jsearch" | …
source_job_id    TEXT,                    -- native job ID extracted best-effort
raw              JSONB NOT NULL,          -- complete raw item, exactly as returned
query_params     JSONB,                   -- {"query": "software engineer", "source": "dice"}
fetched_at       TIMESTAMPTZ DEFAULT now(),
processed_at     TIMESTAMPTZ,             -- set by Phase 2 normalize; NULL = unprocessed
processing_error TEXT                     -- non-NULL when adapt() failed or returned None
```

`processed_at IS NULL` is the Phase 2 pick-up condition. Reprocessing resets
this to NULL for the target rows before re-running normalization.

#### `scrape_runs` — one row per source per run

```sql
id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
source         TEXT NOT NULL,
started_at     TIMESTAMPTZ DEFAULT now(),
finished_at    TIMESTAMPTZ,
status         TEXT DEFAULT 'running',    -- 'ok' | 'error'
jobs_fetched   INTEGER DEFAULT 0,
jobs_inserted  INTEGER DEFAULT 0,
jobs_skipped   INTEGER DEFAULT 0,
error_message  TEXT,
query_params   JSONB
```

---

## Phase 2 — Normalization Pipeline

### Code Flow

```
cli.py normalize
  └── scraper/runner.py :: process_raw_batch(limit, sources, write_db, reprocess)
        ├── [if reprocess] reset_processed(conn, sources)  -- sets processed_at = NULL
        ├── fetch_unprocessed(conn, limit, sources)        -- WHERE processed_at IS NULL
        │
        ├── for each row:
        │     raw_dict = json.loads(row["raw"])            -- asyncpg returns JSONB as str
        │     job = adapters[source].adapt(raw_dict)       -- raw_*.py adapter
        │
        ├── deduplicate(jobs)                              -- by content_hash
        │
        └── if write_db:
              upsert_scraped_job(conn, job, reprocess)     -- ON CONFLICT (content_hash)
              insert_job_skills(conn, job_id, job.skills)
              mark_processed(conn, raw_id)                 -- sets processed_at = now()
```

### Per-Source Adapters (`scraper/adapters/raw_*.py`)

Each adapter implements `BaseAdapter.adapt(raw: dict) -> ScrapedJob | None`.
Returning `None` signals a missing required field (title or company) and marks
the raw row with `processing_error = "adapt returned None"`.

| Adapter | Source-specific notes |
|---------|----------------------|
| `raw_dice.py` | `workplaceTypes` list → `is_remote` bool |
| `raw_serpapi.py` | Salary extracted from `detected_extensions.salary` string |
| `raw_jsearch.py` | Structured salary dict (`job_min_salary`, `job_salary_period`) with period conversion |
| `raw_adzuna.py` | `location.area[]` joined for location string |
| `raw_himalayas.py` | `companyName == "name"` falls back to `companySlug.replace("-"," ").title()` |
| `raw_remoteok.py` | `ftfy.fix_text()` applied to all text fields (UTF-8/Latin-1 mojibake fix) |
| `raw_remotive.py` | Salary extracted from free-text `salary` field |
| `raw_jobicy.py` | `annualSalaryMin`/`annualSalaryMax` + `salaryCurrency` direct integers |
| `raw_hn_hiring.py` | Parses freeform HTML comment; company/title extracted via pipe-pattern regex |

### Normalization Functions (`scraper/normalizer.py`)

All pure functions — no I/O, fully tested in `tests/test_normalizer.py`.

| Function | Input | Output |
|----------|-------|--------|
| `normalize_posted_at(raw)` | ISO 8601, unix ts (sec/ms), relative strings | `datetime \| None` |
| `normalize_salary(salary_str_or_dict, min_val, max_val, currency)` | String range, structured dict, or raw integers | `(int\|None, int\|None, str)` |
| `normalize_work_type(location, description, is_remote)` | Location string + description | `"remote" \| "hybrid" \| "on_site" \| None` |
| `normalize_exp_level(title, description)` | Title + optional description | `(level_str\|None, confidence_float)` |
| `normalize_employment_type(raw)` | Raw string | `"full_time" \| "part_time" \| "contract" \| "internship" \| None` |
| `strip_html(html)` | HTML string | Plain text via BeautifulSoup lxml |
| `extract_skills(text)` | Job description text | `list[str]` — 47 skill patterns |
| `map_category(title, description)` | Title + description | `"engineering" \| "data" \| "finance" \| "design" \| "marketing" \| "sales" \| "operations" \| "product" \| "other"` |

**`normalize_salary` dict input shape** (used by JSearch adapter):
```python
{"min": 120000, "max": 160000, "currency": "USD", "period": "YEAR"}
# period values: "YEAR" (pass-through), "MONTH" (×12), "HOUR" (×2080)
```

**`normalize_exp_level` confidence model:**
- Title match → confidence from tier (1.0 for keyword, 0.8 for year-range)
- Description match → confidence × 0.65 (lower signal)
- No match → `(None, 0.0)`

### Deduplication (`scraper/deduplicator.py`)

```python
content_hash = SHA-256(title.lower() | company.lower() | description_text[:300].lower())[:32]
```

Within a single batch, `deduplicate()` keeps the first occurrence of each
`content_hash`. `is_fuzzy_duplicate()` also catches cross-source duplicates
where `fuzz.ratio(title_a, title_b) >= 90` and same company.

The `content_hash` is the upsert conflict key in `scraped_jobs`. Because the
hash includes description text, encoding fixes (e.g., `ftfy`) change the hash
and produce a new row rather than updating in place — old stale rows must be
deleted separately after an encoding-fix reprocess.

### Database Schema — Phase 2

#### `scraped_jobs` — one row per unique job

```sql
id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
content_hash         TEXT NOT NULL UNIQUE,           -- SHA-256[:32] dedup key
source               TEXT NOT NULL,                   -- originating source
source_urls          TEXT[] NOT NULL DEFAULT '{}',    -- merged across sources on conflict
source_job_id        TEXT,
title                TEXT NOT NULL,
company              TEXT NOT NULL,
company_slug         TEXT,
location_city        TEXT,
location_country     TEXT DEFAULT 'US',
remote_raw           TEXT,                            -- original location string
work_type            TEXT,                            -- 'remote' | 'hybrid' | 'on_site'
employment_type      TEXT,                            -- 'full_time' | 'part_time' | 'contract' | 'internship'
experience_level     TEXT,                            -- 'internship' | 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
exp_level_confidence DOUBLE PRECISION DEFAULT 0.0,
category             TEXT,                            -- engineering | data | finance | design | marketing | sales | operations | product | other
description_html     TEXT,
description_text     TEXT,
salary_min           INTEGER,
salary_max           INTEGER,
salary_currency      TEXT DEFAULT 'USD',
salary_raw           TEXT,
posted_at            TIMESTAMPTZ,
scraped_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
expires_at           TIMESTAMPTZ NOT NULL DEFAULT now() + interval '72 hours'
```

**ON CONFLICT behavior:**
- Normal upsert: merges `source_urls` (deduplicates), updates `scraped_at`/`expires_at` only
- Reprocess upsert (`--reprocess`): also overwrites `salary_min`, `salary_max`,
  `salary_currency`, `salary_raw`, `experience_level`, `exp_level_confidence`,
  `description_html`, `description_text`
- Never overwritten: `id`, `content_hash`, `posted_at`, `scraped_at` (original)

#### `job_skills` — many-to-many

```sql
job_id   UUID NOT NULL REFERENCES scraped_jobs(id),
skill    TEXT NOT NULL,
PRIMARY KEY (job_id, skill)
```

Populated by `insert_job_skills()` using `ON CONFLICT DO NOTHING`.

---

## CLI

```bash
# ── Phase 1: fetch raw ────────────────────────────────────────────────────────

# Fetch from all 9 sources → write to raw_jobs
python cli.py fetch-raw --query "software engineer"

# Specific sources only
python cli.py fetch-raw --sources dice remoteok serpapi jsearch

# Dry run — no DB write, prints JSON to stdout
python cli.py fetch-raw --sources himalayas --no-db

# Save raw output to file
python cli.py fetch-raw --query "data engineer" --no-db --output results.json


# ── Phase 2: normalize ────────────────────────────────────────────────────────

# Normalize up to 100 unprocessed raw_jobs rows → scraped_jobs
python cli.py normalize

# Specific sources, larger batch
python cli.py normalize --sources dice remoteok --limit 500

# Dry run — normalize but do not write to scraped_jobs, print JSON to stdout
python cli.py normalize --no-db

# Reprocess existing rows (reset processed_at, re-run adapters, DO UPDATE scraped_jobs)
python cli.py normalize --reprocess --sources jsearch
python cli.py normalize --reprocess --sources remoteok
python cli.py normalize --reprocess                      # all sources
```

`--reprocess` is used to apply adapter or normalizer bug fixes to rows already
in `scraped_jobs`. It resets `processed_at = NULL` on the target raw rows, then
runs the normal pipeline with a full DO UPDATE upsert.

---

## Configuration (`config.py`)

All settings loaded from `.env`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Supabase pooler URL) |
| `SERPAPI_KEY` | For serpapi | SerpAPI key |
| `JSEARCH_KEY` | For jsearch | RapidAPI key (subscribed to JSearch) |
| `ADZUNA_APP_ID` | For adzuna | Adzuna application ID |
| `ADZUNA_APP_KEY` | For adzuna | Adzuna application key |
| `PLAYWRIGHT_HEADLESS` | No | Run browsers headlessly (default: true) |
| `MAX_AGE_HOURS` | No | Age filter for normalized pipeline (default: 24) |
| `REQUEST_TIMEOUT_SECONDS` | No | httpx timeout (default: 30) |
| `CONCURRENT_ADAPTERS` | No | Max parallel adapters in normalized pipeline (default: 4) |
| `SCRAPE_INTERVAL_HOURS` | No | Scheduler sleep between cycles (default: 1) |

---

## Dependencies (`requirements.txt`)

| Package | Purpose |
|---------|---------|
| `httpx` | HTTP client for all non-Dice sources |
| `beautifulsoup4` + `lxml` | HTML stripping in normalizer |
| `playwright` + `playwright-stealth` | Legacy browser adapters (unused in active pipeline) |
| `pydantic-settings` | Config loading from `.env` |
| `google-search-results` | SerpAPI Python SDK |
| `asyncpg` | Async PostgreSQL client (Supabase) |
| `rapidfuzz` | Fuzzy deduplication across sources |
| `ftfy` | Fix UTF-8/Latin-1 mojibake in RemoteOK descriptions |
| `respx` | HTTP mocking for tests |
| `pytest` + `pytest-asyncio` | Test runner |

---

## Raw Field Inventory by Source

What each source returns in the `raw` JSONB column before normalization:

| Source | Key fields in `raw` |
|--------|-------------------|
| **Dice** | `id`, `guid`, `title`, `companyName`, `jobLocation`, `employmentType`, `employerType`, `postedDate`, `modifiedDate`, `summary`, `salary`, `isRemote`, `workplaceTypes`, `detailsPageUrl`, `easyApply` |
| **SerpAPI** | `job_id`, `title`, `job_title`, `company_name`, `location`, `via`, `description`, `detected_extensions` (salary, schedule, posted_at), `extensions`, `share_link`, `apply_options`, `thumbnail` |
| **JSearch** | `job_id`, `job_title`, `employer_name`, `employer_logo`, `employer_website`, `job_publisher`, `job_employment_type`, `job_location`, `job_city`, `job_state`, `job_country`, `job_description`, `job_posted_at_datetime_utc`, `job_min_salary`, `job_max_salary`, `job_salary_currency`, `job_salary_period`, `job_apply_link` |
| **Adzuna** | `id`, `title`, `company`, `location`, `description`, `redirect_url`, `created`, `salary_min`, `salary_max`, `salary_is_predicted`, `category`, `contract_type`, `contract_time` |
| **Himalayas** | `guid`, `title`, `companyName`, `companySlug`, `companyLogo`, `applicationLink`, `description`, `excerpt`, `employmentType`, `seniority`, `categories`, `parentCategories`, `locationRestrictions`, `timezoneRestrictions`, `minSalary`, `maxSalary`, `currency`, `pubDate`, `expiryDate` |
| **RemoteOK** | `id`, `url`, `title`, `company`, `company_logo`, `description`, `tags`, `date`, `salary_min`, `salary_max`, `location`, `apply_url` |
| **Remotive** | `id`, `url`, `title`, `company_name`, `company_logo`, `description`, `job_type`, `publication_date`, `salary`, `tags`, `candidate_required_location` |
| **Jobicy** | `id`, `url`, `jobTitle`, `companyName`, `companyLogo`, `jobIndustry`, `jobType`, `jobGeo`, `jobLevel`, `jobExcerpt`, `jobDescription`, `pubDate`, `annualSalaryMin`, `annualSalaryMax`, `salaryCurrency` |
| **HN Hiring** | `id`, `by`, `text` (raw HTML job post), `time`, `parent`, `thread_id`, `thread_title` |
