"""
SerpAPI — Google Jobs endpoint.
Requires SERPAPI_KEY. Skips gracefully when key is absent.
"""
import httpx

from config import settings

SOURCE = "serpapi"
_URL = "https://serpapi.com/search.json"


async def fetch(query: str, location: str = "United States", page: int = 0) -> list[dict]:
    """
    Returns raw job dicts from SerpAPI jobs_results array.
    SerpAPI uses 0-based page index via `start` param (10 per page).
    """
    if not settings.SERPAPI_KEY:
        print("[serpapi] SERPAPI_KEY not set — skipping")
        return []

    params = {
        "engine": "google_jobs",
        "q": query,
        "location": location,
        "chips": "date_posted:today",
        "api_key": settings.SERPAPI_KEY,
        "start": page * 10,
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(_URL, params=params)
        if resp.status_code != 200:
            print(f"[serpapi] HTTP {resp.status_code}: {resp.text[:200]}")
            return []
        data = resp.json()
    except Exception as exc:
        print(f"[serpapi] request failed: {exc}")
        return []

    jobs = data.get("jobs_results", [])
    print(f"[serpapi] fetched {len(jobs)} jobs (page {page})")
    return jobs
