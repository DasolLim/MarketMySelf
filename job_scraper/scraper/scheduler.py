import asyncio
import logging
from datetime import datetime, timezone

from config import settings
from scraper.runner import run

log = logging.getLogger(__name__)

KEYWORD_BUCKETS = [
    "software engineer",
    "data scientist",
    "product manager",
    "marketing manager",
    "financial analyst",
    "designer",
    "sales",
    "operations",
    "customer success",
    "devops",
    "machine learning",
    "backend developer",
    "frontend developer",
    "full stack developer",
    "data engineer",
    "business analyst",
    "account executive",
    "recruiter",
    "project manager",
    "consultant",
]


async def run_scheduled() -> None:
    """Rotate through KEYWORD_BUCKETS indefinitely, sleeping between full cycles."""
    interval = settings.SCRAPE_INTERVAL_HOURS * 3600

    while True:
        cycle_start = datetime.now(timezone.utc)
        log.info(f"[scheduler] starting cycle at {cycle_start.isoformat()}")

        for bucket in KEYWORD_BUCKETS:
            log.info(f"[scheduler] scraping bucket: {bucket!r}")
            jobs = await run(keywords=bucket, max_age_hours=24, write_db=True)
            log.info(f"[scheduler] {bucket!r}: {len(jobs)} jobs")

        log.info(f"[scheduler] cycle complete, sleeping {interval}s")
        await asyncio.sleep(interval)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_scheduled())
