from __future__ import annotations

import json
from typing import TYPE_CHECKING

import asyncpg

from config import settings
from scraper.adapters import ALL_RAW_ADAPTERS
from scraper.deduplicator import deduplicate
from scraper.models import ScrapedJob

if TYPE_CHECKING:
    from elasticsearch import AsyncElasticsearch


async def process_raw_batch(
    limit: int = 100,
    sources: list[str] | None = None,
    write_db: bool = True,
    reprocess: bool = False,
    es_client: AsyncElasticsearch | None = None,
) -> dict:
    """
    Read unprocessed rows from raw_jobs, normalise them via per-source adapters,
    deduplicate by content_hash, upsert to scraped_jobs, and mark rows processed.

    When reprocess=True, resets processed_at on the target rows first so they are
    picked up again, and uses DO UPDATE to overwrite corrected fields in place.

    When es_client is provided, newly inserted jobs (or all jobs during reprocess)
    are indexed into Elasticsearch immediately. ES failures never block the pipeline.

    Returns a summary dict with keys: raw_rows, adapted, unique, errors, jobs.
    """
    from scraper.storage import (
        fetch_unprocessed,
        insert_job_skills,
        mark_processed,
        reset_processed,
        upsert_scraped_job,
    )

    conn: asyncpg.Connection = await asyncpg.connect(settings.DATABASE_URL)
    try:
        if reprocess:
            n_reset = await reset_processed(conn, sources)
            print(f"[runner] reprocess: reset {n_reset} raw_jobs rows")

        rows = await fetch_unprocessed(conn, limit=limit, sources=sources)
        adapters = {s: cls() for s, cls in ALL_RAW_ADAPTERS.items()}

        jobs: list[ScrapedJob] = []
        raw_to_job: dict[int, ScrapedJob] = {}
        errors: dict[int, str] = {}

        for row in rows:
            src    = row["source"]
            raw_id = row["id"]
            if src not in adapters:
                errors[raw_id] = f"no adapter for source '{src}'"
                continue
            try:
                raw_dict = row["raw"] if isinstance(row["raw"], dict) else json.loads(row["raw"])
                job = adapters[src].adapt(raw_dict)
                if job is None:
                    errors[raw_id] = "adapt returned None (missing required fields)"
                else:
                    jobs.append(job)
                    raw_to_job[raw_id] = job
            except Exception as exc:
                errors[raw_id] = str(exc)

        unique = deduplicate(jobs)
        print(
            f"[runner] {len(rows)} raw rows → {len(jobs)} adapted "
            f"→ {len(unique)} unique  ({len(errors)} errors)"
        )

        if write_db:
            for job in unique:
                try:
                    job_id, was_inserted = await upsert_scraped_job(
                        conn, job, reprocess=reprocess
                    )
                    if job.skills:
                        await insert_job_skills(conn, job_id, job.skills)
                    # Index into ES for new inserts (always during reprocess)
                    if es_client and (was_inserted or reprocess):
                        from scraper.es_indexer import index_job
                        job.id = job_id
                        await index_job(es_client, settings.ELASTICSEARCH_INDEX, job)
                except Exception as exc:
                    print(f"[runner] upsert failed for '{job.title}': {exc}")

            for rid in raw_to_job:
                await mark_processed(conn, rid)
            for rid, err in errors.items():
                await mark_processed(conn, rid, error=err)

        return {
            "raw_rows": len(rows),
            "adapted":  len(jobs),
            "unique":   len(unique),
            "errors":   len(errors),
            "jobs":     unique,
        }
    finally:
        await conn.close()
