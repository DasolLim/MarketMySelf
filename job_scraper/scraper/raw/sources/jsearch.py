"""
JSearch via RapidAPI — covers LinkedIn, Indeed, Glassdoor, and more.
Requires JSEARCH_KEY. Skips gracefully when key is absent.
"""
import httpx

from config import settings

SOURCE = "jsearch"
_URL = "https://jsearch.p.rapidapi.com/search"
_HOST = "jsearch.p.rapidapi.com"


async def fetch(query: str, page: int = 1, country: str = "us") -> list[dict]:
    """
    Returns raw job dicts from JSearch data array.
    """
    if not settings.JSEARCH_KEY:
        print("[jsearch] JSEARCH_KEY not set — skipping")
        return []

    headers = {
        "X-RapidAPI-Key": settings.JSEARCH_KEY,
        "X-RapidAPI-Host": _HOST,
    }
    params = {
        "query": query,
        "page": str(page),
        "num_pages": "1",
        "country": country,
        "date_posted": "today",
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(_URL, headers=headers, params=params)
        if resp.status_code != 200:
            print(f"[jsearch] HTTP {resp.status_code}: {resp.text[:200]}")
            return []
        data = resp.json()
    except Exception as exc:
        print(f"[jsearch] request failed: {exc}")
        return []

    if data.get("status") != "OK":
        print(f"[jsearch] non-OK status: {data.get('status')} — {data.get('message', '')}")
        return []

    raw_data = data.get("data", [])
    jobs = raw_data if isinstance(raw_data, list) else raw_data.get("jobs", [])
    print(f"[jsearch] fetched {len(jobs)} jobs (page {page})")
    return jobs
