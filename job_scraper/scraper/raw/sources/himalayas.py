"""
Himalayas.app — public JSON API for remote jobs.
No authentication required.
"""
import httpx

from scraper.raw.anti_detect import json_headers, throttle

SOURCE = "himalayas"
_DOMAIN = "himalayas.app"
_URL = "https://himalayas.app/jobs/api"
_RATE = 1.5


async def fetch(query: str = "", limit: int = 100, offset: int = 0) -> list[dict]:
    """
    Returns raw job dicts from Himalayas API.
    The API supports limit/offset pagination and an optional ?q= filter.
    """
    params: dict = {"limit": str(limit), "offset": str(offset)}
    if query:
        params["q"] = query

    await throttle.wait(_DOMAIN, _RATE)
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(_URL, params=params, headers=json_headers())
        if resp.status_code != 200:
            print(f"[himalayas] HTTP {resp.status_code}")
            return []
        data = resp.json()
    except Exception as exc:
        print(f"[himalayas] request failed: {exc}")
        return []

    jobs = data.get("jobs", data if isinstance(data, list) else [])
    print(f"[himalayas] fetched {len(jobs)} jobs (total={data.get('total', '?')})")
    return jobs
