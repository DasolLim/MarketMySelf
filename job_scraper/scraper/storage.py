import asyncpg

from config import settings
from scraper.models import ScrapedJob


# ── Phase 2 — raw_jobs helpers ────────────────────────────────────────────────

async def fetch_unprocessed(
    conn: asyncpg.Connection,
    limit: int = 100,
    sources: list[str] | None = None,
) -> list[asyncpg.Record]:
    """Return up to `limit` raw_jobs rows where processed_at IS NULL."""
    if sources:
        return await conn.fetch(
            """
            SELECT id, source, raw, query_params
            FROM   raw_jobs
            WHERE  processed_at IS NULL
              AND  source = ANY($1)
            ORDER  BY fetched_at ASC
            LIMIT  $2
            """,
            sources,
            limit,
        )
    return await conn.fetch(
        """
        SELECT id, source, raw, query_params
        FROM   raw_jobs
        WHERE  processed_at IS NULL
        ORDER  BY fetched_at ASC
        LIMIT  $1
        """,
        limit,
    )


async def mark_processed(
    conn: asyncpg.Connection,
    raw_id: int,
    error: str | None = None,
) -> None:
    await conn.execute(
        "UPDATE raw_jobs SET processed_at = now(), processing_error = $1 WHERE id = $2",
        error,
        raw_id,
    )


async def reset_processed(
    conn: asyncpg.Connection,
    sources: list[str] | None = None,
) -> int:
    """Reset processed_at to NULL so rows are picked up again by fetch_unprocessed."""
    if sources:
        result = await conn.execute(
            "UPDATE raw_jobs SET processed_at = NULL, processing_error = NULL WHERE source = ANY($1)",
            sources,
        )
    else:
        result = await conn.execute(
            "UPDATE raw_jobs SET processed_at = NULL, processing_error = NULL"
        )
    return int(result.split()[-1])


# ── Phase 2 — scraped_jobs upsert ─────────────────────────────────────────────

async def upsert_scraped_job(
    conn: asyncpg.Connection,
    job: ScrapedJob,
    reprocess: bool = False,
) -> tuple[str, bool]:
    """Insert or update a ScrapedJob; returns (uuid, was_inserted).

    was_inserted is True for fresh inserts, False for ON CONFLICT DO UPDATE.
    Uses PostgreSQL's xmax = 0 trick to distinguish insert from update.

    When reprocess=True, salary/exp_level/description fields are overwritten on
    conflict so existing rows pick up the corrected values.
    """
    on_conflict = (
        """
        ON CONFLICT (content_hash) DO UPDATE
            SET salary_min           = EXCLUDED.salary_min,
                salary_max           = EXCLUDED.salary_max,
                salary_currency      = EXCLUDED.salary_currency,
                salary_raw           = EXCLUDED.salary_raw,
                experience_level     = EXCLUDED.experience_level,
                exp_level_confidence = EXCLUDED.exp_level_confidence,
                description_html     = EXCLUDED.description_html,
                description_text     = EXCLUDED.description_text,
                source_urls = (
                    SELECT array_agg(DISTINCT u)
                    FROM   unnest(scraped_jobs.source_urls || EXCLUDED.source_urls) AS u
                ),
                scraped_at  = EXCLUDED.scraped_at,
                expires_at  = EXCLUDED.expires_at
        """
        if reprocess
        else """
        ON CONFLICT (content_hash) DO UPDATE
            SET source_urls = (
                    SELECT array_agg(DISTINCT u)
                    FROM   unnest(scraped_jobs.source_urls || EXCLUDED.source_urls) AS u
                ),
                scraped_at  = EXCLUDED.scraped_at,
                expires_at  = EXCLUDED.expires_at
        """
    )
    row = await conn.fetchrow(
        f"""
        INSERT INTO scraped_jobs (
            content_hash, source, source_urls, source_job_id,
            title, company, company_slug,
            location_city, location_country, remote_raw,
            work_type, employment_type, experience_level, exp_level_confidence,
            category, description_html, description_text,
            salary_min, salary_max, salary_currency, salary_raw,
            posted_at, scraped_at, expires_at
        ) VALUES (
            $1,  $2,  $3,  $4,
            $5,  $6,  $7,
            $8,  $9,  $10,
            $11, $12, $13, $14,
            $15, $16, $17,
            $18, $19, $20, $21,
            $22, $23, $24
        )
        {on_conflict}
        RETURNING id::text, (xmax = 0) AS was_inserted
        """,
        job.content_hash,
        job.source,
        job.source_urls,
        job.source_job_id,
        job.title,
        job.company,
        job.company_slug,
        job.location_city,
        job.location_country,
        job.remote_raw,
        job.work_type,
        job.employment_type,
        job.experience_level,
        job.exp_level_confidence,
        job.category,
        job.description_html,
        job.description_text,
        job.salary_min,
        job.salary_max,
        job.salary_currency,
        job.salary_raw,
        job.posted_at,
        job.scraped_at,
        job.expires_at,
    )
    return row["id"], row["was_inserted"]


async def insert_job_skills(
    conn: asyncpg.Connection,
    job_id: str,
    skills: list[str],
) -> None:
    if not skills:
        return
    await conn.executemany(
        "INSERT INTO job_skills (job_id, skill) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [(job_id, skill) for skill in skills],
    )


# ── Query helpers (used by backend API) ──────────────────────────────────────

async def search_jobs(filters: dict | None = None) -> list[dict]:
    """Query scraped_jobs with optional filters. Returns list of row dicts."""
    filters = filters or {}
    conn: asyncpg.Connection = await asyncpg.connect(settings.DATABASE_URL)
    try:
        conditions = ["expires_at > now()"]
        params: list = []
        n = 1

        if kw := filters.get("keywords"):
            conditions.append(
                f"to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description_text,''))"
                f" @@ plainto_tsquery('english', ${n})"
            )
            params.append(kw)
            n += 1

        for col in ("work_type", "experience_level", "category", "location_city", "source"):
            if val := filters.get(col):
                conditions.append(f"{col} = ${n}")
                params.append(val)
                n += 1

        limit  = int(filters.get("limit", 50))
        offset = int(filters.get("offset", 0))
        params.extend([limit, offset])

        where = " AND ".join(conditions)
        query = (
            f"SELECT id, source, source_job_id, source_urls, title, company,"
            f" work_type, employment_type, experience_level, category,"
            f" location_city, salary_min, salary_max, salary_currency,"
            f" posted_at, scraped_at"
            f" FROM scraped_jobs"
            f" WHERE {where}"
            f" ORDER BY posted_at DESC NULLS LAST"
            f" LIMIT ${n} OFFSET ${n + 1}"
        )
        rows = await conn.fetch(query, *params)
        return [dict(r) for r in rows]
    finally:
        await conn.close()


async def fetch_active_jobs(conn: asyncpg.Connection) -> list[ScrapedJob]:
    """Return all non-expired scraped_jobs with their skills as ScrapedJob objects."""
    rows = await conn.fetch(
        """
        SELECT
            sj.id::text,
            sj.content_hash,
            sj.source,
            sj.source_urls,
            sj.source_job_id,
            sj.title,
            sj.company,
            sj.company_slug,
            sj.location_city,
            sj.location_country,
            sj.remote_raw,
            sj.work_type,
            sj.employment_type,
            sj.experience_level,
            sj.exp_level_confidence,
            sj.category,
            sj.description_html,
            sj.description_text,
            sj.salary_min,
            sj.salary_max,
            sj.salary_currency,
            sj.salary_raw,
            sj.posted_at,
            sj.scraped_at,
            sj.expires_at,
            coalesce(
                array_agg(js.skill) FILTER (WHERE js.skill IS NOT NULL),
                '{}'::text[]
            ) AS skills
        FROM   scraped_jobs sj
        LEFT JOIN job_skills js ON js.job_id = sj.id
        WHERE  sj.expires_at > now()
        GROUP  BY sj.id
        ORDER  BY sj.scraped_at DESC
        """
    )
    jobs: list[ScrapedJob] = []
    for row in rows:
        jobs.append(
            ScrapedJob(
                id=row["id"],
                content_hash=row["content_hash"],
                source=row["source"],
                source_urls=list(row["source_urls"] or []),
                source_job_id=row["source_job_id"],
                title=row["title"],
                company=row["company"],
                company_slug=row["company_slug"],
                location_city=row["location_city"],
                location_country=row["location_country"] or "US",
                remote_raw=row["remote_raw"],
                work_type=row["work_type"],
                employment_type=row["employment_type"],
                experience_level=row["experience_level"],
                exp_level_confidence=row["exp_level_confidence"] or 0.0,
                category=row["category"],
                description_html=row["description_html"],
                description_text=row["description_text"],
                salary_min=row["salary_min"],
                salary_max=row["salary_max"],
                salary_currency=row["salary_currency"] or "USD",
                salary_raw=row["salary_raw"],
                posted_at=row["posted_at"],
                scraped_at=row["scraped_at"],
                expires_at=row["expires_at"],
                skills=list(row["skills"] or []),
            )
        )
    return jobs


async def purge_expired() -> int:
    """Delete expired rows; return count deleted."""
    conn: asyncpg.Connection = await asyncpg.connect(settings.DATABASE_URL)
    try:
        result = await conn.execute("DELETE FROM scraped_jobs WHERE expires_at < now()")
        return int(result.split()[-1])
    finally:
        await conn.close()
