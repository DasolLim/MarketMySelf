"""
RemoteOK — public JSON API, no auth required.
https://remoteok.com/api
"""
import httpx

from scraper.raw.anti_detect import json_headers, throttle

SOURCE = "remoteok"
_DOMAIN = "remoteok.com"
_URL = "https://remoteok.com/api"
_RATE = 2.0


async def fetch(query: str = "") -> list[dict]:
    """
    Returns raw job dicts from RemoteOK.
    The first element in the API response is a legal/metadata notice — skipped.
    Each job dict contains: id, url, title, company, description, tags,
    date, salary_min, salary_max, location.
    """
    # RemoteOK tags must be exact slugs (e.g. "python", "react").
    # Free-text queries don't map cleanly, so fetch all and let the
    # normalizer handle filtering in Phase 2.
    params: dict = {}

    await throttle.wait(_DOMAIN, _RATE)
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(_URL, params=params, headers=json_headers())
        if resp.status_code != 200:
            print(f"[remoteok] HTTP {resp.status_code}")
            return []
        data = resp.json()
    except Exception as exc:
        print(f"[remoteok] request failed: {exc}")
        return []

    # First item is a metadata/legal object with no "id" field — skip it
    jobs = [item for item in data if isinstance(item, dict) and item.get("id")]
    print(f"[remoteok] fetched {len(jobs)} jobs")
    return jobs
