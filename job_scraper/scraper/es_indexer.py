from __future__ import annotations

import asyncpg
from elasticsearch import AsyncElasticsearch
from elasticsearch.helpers import async_bulk

from config import settings
from scraper.es_index import build_document
from scraper.models import ScrapedJob


async def index_job(
    es: AsyncElasticsearch,
    index: str,
    job: ScrapedJob,
) -> bool:
    """Index a single job document. Returns True on success, False on failure.

    Uses job.id (Postgres UUID) as the ES document ID — idempotent.
    """
    if not job.id:
        print(f"[es] index_job skipped: job has no id (title={job.title!r})")
        return False
    try:
        await es.index(index=index, id=job.id, document=build_document(job))
        return True
    except Exception as exc:
        print(f"[es] index_job failed for {job.id} ({job.title!r}): {exc}")
        return False


async def index_batch(
    es: AsyncElasticsearch,
    index: str,
    jobs: list[ScrapedJob],
) -> dict:
    """Bulk-index a list of jobs. Returns {indexed, errors, failed_ids}."""
    if not jobs:
        return {"indexed": 0, "errors": 0, "failed_ids": []}

    actions = [
        {
            "_index":  index,
            "_id":     job.id,
            "_source": build_document(job),
        }
        for job in jobs
        if job.id
    ]

    try:
        success, error_items = await async_bulk(es, actions, raise_on_error=False)
    except Exception as exc:
        print(f"[es] index_batch failed: {exc}")
        return {"indexed": 0, "errors": len(jobs), "failed_ids": [j.id for j in jobs if j.id]}

    failed_ids: list[str] = []
    for item in error_items:
        op = item.get("index") or item.get("create") or {}
        doc_id = op.get("_id", "unknown")
        reason = op.get("error", {})
        print(f"[es] bulk index failed for {doc_id}: {reason}")
        failed_ids.append(doc_id)

    return {
        "indexed":    success,
        "errors":     len(failed_ids),
        "failed_ids": failed_ids,
    }


async def delete_job(
    es: AsyncElasticsearch,
    index: str,
    job_id: str,
) -> bool:
    """Delete a single document by Postgres UUID. Returns True on success."""
    try:
        await es.delete(index=index, id=job_id, ignore=[404])
        return True
    except Exception as exc:
        print(f"[es] delete_job failed for {job_id}: {exc}")
        return False


async def full_reindex(
    es: AsyncElasticsearch,
    index: str,
    pg_conn: asyncpg.Connection,
) -> dict:
    """Read all active jobs from Postgres and index them in batches of 100.

    Does NOT delete/recreate the index — updates in place. Use --reset for
    mapping changes.
    """
    from scraper.storage import fetch_active_jobs

    jobs = await fetch_active_jobs(pg_conn)
    total = len(jobs)
    indexed = 0
    errors = 0

    chunk_size = 100
    for i in range(0, total, chunk_size):
        chunk = jobs[i : i + chunk_size]
        result = await index_batch(es, index, chunk)
        indexed += result["indexed"]
        errors  += result["errors"]
        print(
            f"[es] reindex {i + len(chunk)}/{total} "
            f"(+{result['indexed']} indexed, {result['errors']} errors)"
        )

    return {"total": total, "indexed": indexed, "errors": errors}
