import json

import asyncpg

from config import settings


async def insert_raw(items: list[dict], source: str, query_params: dict) -> dict:
    """
    Insert raw job items into raw_jobs and record a scrape_run entry.
    Returns {"fetched": N, "inserted": N, "run_id": N}.
    """
    if not settings.DATABASE_URL:
        print(f"[raw.storage] DATABASE_URL not set — skipping DB write for {source}")
        return {"fetched": len(items), "inserted": 0, "run_id": None}

    conn: asyncpg.Connection = await asyncpg.connect(settings.DATABASE_URL)
    run_id: int | None = None
    try:
        row = await conn.fetchrow(
            "INSERT INTO scrape_runs (source, query_params) VALUES ($1, $2) RETURNING id",
            source,
            json.dumps(query_params),
        )
        run_id = row["id"]

        inserted = 0
        for item in items:
            source_job_id = _extract_job_id(item, source)
            await conn.execute(
                """
                INSERT INTO raw_jobs (source, source_job_id, raw, query_params)
                VALUES ($1, $2, $3::jsonb, $4::jsonb)
                """,
                source,
                source_job_id,
                json.dumps(item, default=str),
                json.dumps(query_params),
            )
            inserted += 1

        await conn.execute(
            """
            UPDATE scrape_runs
            SET finished_at = now(), status = 'ok',
                jobs_fetched = $1, jobs_inserted = $2
            WHERE id = $3
            """,
            len(items),
            inserted,
            run_id,
        )
        return {"fetched": len(items), "inserted": inserted, "run_id": run_id}

    except Exception as exc:
        if run_id is not None:
            await conn.execute(
                """
                UPDATE scrape_runs
                SET finished_at = now(), status = 'error', error_message = $1
                WHERE id = $2
                """,
                str(exc),
                run_id,
            )
        raise
    finally:
        await conn.close()


def _extract_job_id(item: dict, source: str) -> str | None:
    candidates: dict[str, list[str]] = {
        "dice":       ["id", "guid"],
        "serpapi":    ["job_id"],
        "jsearch":    ["job_id"],
        "adzuna":     ["id"],
        "wellfound":  ["jobUrl"],
        "himalayas":  ["id", "url"],
        "rareroles":  ["url"],
        "stillhiring": ["url"],
    }
    for field in candidates.get(source, ["id", "job_id", "url"]):
        val = item.get(field)
        if val:
            return str(val)[:500]
    return None
