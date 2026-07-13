"""
Raw runner — fans out to all configured sources, stores results in raw_jobs.
Every source is independent; one failure never blocks the others.
"""
import asyncio
import time

from scraper.raw.sources import (
    adzuna, dice, himalayas, hn_hiring, jobicy,
    jsearch, remoteok, remotive, serpapi,
)
from scraper.raw.storage import insert_raw

ALL_SOURCES: dict[str, object] = {
    # API sources
    "dice":       dice,
    "serpapi":    serpapi,
    "jsearch":    jsearch,
    "adzuna":     adzuna,
    # Direct scrape / public JSON
    "himalayas":  himalayas,
    "remoteok":   remoteok,
    "remotive":   remotive,
    "jobicy":     jobicy,
    "hn_hiring":  hn_hiring,
}


async def run_raw(
    query: str = "software engineer",
    sources: list[str] | None = None,
    write_db: bool = True,
) -> dict[str, list[dict]]:
    """
    Fetch raw jobs from all requested sources concurrently.
    Returns a dict keyed by source name → list of raw dicts.
    """
    requested = sources if sources is not None else list(ALL_SOURCES.keys())
    unknown = [s for s in requested if s not in ALL_SOURCES]
    if unknown:
        print(f"[raw.runner] unknown sources ignored: {unknown}")

    active = [s for s in requested if s in ALL_SOURCES]

    async def _fetch_one(name: str) -> tuple[str, list[dict]]:
        mod = ALL_SOURCES[name]
        t0 = time.perf_counter()
        try:
            items = await mod.fetch(query=query)
        except Exception as exc:
            print(f"[raw.runner] {name} raised: {exc}")
            items = []
        elapsed = time.perf_counter() - t0
        print(f"[raw.runner] {name}: {len(items)} items in {elapsed:.1f}s")
        return name, items

    pairs = await asyncio.gather(*[_fetch_one(s) for s in active])
    results: dict[str, list[dict]] = {name: items for name, items in pairs}

    if write_db:
        query_params = {"query": query}
        db_tasks = [
            insert_raw(items, source, {**query_params, "source": source})
            for source, items in results.items()
            if items
        ]
        if db_tasks:
            db_results = await asyncio.gather(*db_tasks, return_exceptions=True)
            active_with_items = [s for s in active if results[s]]
            for source, result in zip(active_with_items, db_results):
                if isinstance(result, Exception):
                    print(f"[raw.runner] DB write failed for {source}: {result}")
                else:
                    print(f"[raw.runner] {source}: stored {result['inserted']} rows (run_id={result['run_id']})")

    total = sum(len(v) for v in results.values())
    print(f"[raw.runner] done — {total} total raw items across {len(active)} sources")
    return results
