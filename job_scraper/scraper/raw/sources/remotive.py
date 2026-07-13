"""
Remotive — public JSON API, no auth required.
https://remotive.com/api/remote-jobs
"""
import httpx

from scraper.raw.anti_detect import json_headers, throttle

SOURCE = "remotive"
_DOMAIN = "remotive.com"
_URL = "https://remotive.com/api/remote-jobs"
_RATE = 1.5


async def fetch(query: str = "") -> list[dict]:
    """
    Returns raw job dicts from Remotive.
    Each job dict contains: id, url, title, company_name, description,
    job_type, publication_date, salary, tags, candidate_required_location.
    """
    params: dict = {"limit": 100}
    if query:
        params["search"] = query

    await throttle.wait(_DOMAIN, _RATE)
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(_URL, params=params, headers=json_headers())
        if resp.status_code != 200:
            print(f"[remotive] HTTP {resp.status_code}")
            return []
        data = resp.json()
    except Exception as exc:
        print(f"[remotive] request failed: {exc}")
        return []

    jobs = data.get("jobs", [])
    print(f"[remotive] fetched {len(jobs)} jobs (total={data.get('job-count', '?')})")
    return jobs
