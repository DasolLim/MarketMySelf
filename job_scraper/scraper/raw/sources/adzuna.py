"""
Adzuna REST API — free, no rate hard limit under fair use.
Requires ADZUNA_APP_ID + ADZUNA_APP_KEY. Skips gracefully when absent.
"""
import httpx

from config import settings

SOURCE = "adzuna"
_BASE = "https://api.adzuna.com/v1/api/jobs/us/search"


async def fetch(query: str, page: int = 1, results_per_page: int = 50) -> list[dict]:
    """
    Returns raw job dicts from Adzuna results array.
    """
    if not settings.ADZUNA_APP_ID or not settings.ADZUNA_APP_KEY:
        print("[adzuna] ADZUNA_APP_ID / ADZUNA_APP_KEY not set — skipping")
        return []

    url = f"{_BASE}/{page}"
    params = {
        "app_id": settings.ADZUNA_APP_ID,
        "app_key": settings.ADZUNA_APP_KEY,
        "results_per_page": str(results_per_page),
        "what": query,
        "where": "United States",
        "content-type": "application/json",
        "sort_by": "date",
        "max_days_old": "1",
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, params=params)
        if resp.status_code != 200:
            print(f"[adzuna] HTTP {resp.status_code}: {resp.text[:200]}")
            return []
        data = resp.json()
    except Exception as exc:
        print(f"[adzuna] request failed: {exc}")
        return []

    jobs = data.get("results", [])
    print(f"[adzuna] fetched {len(jobs)} jobs (page {page}, total={data.get('count', '?')})")
    return jobs
