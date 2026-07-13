"""
Jobicy — public JSON API, no auth required.
https://jobicy.com/api/v2/remote-jobs
"""
import httpx

from scraper.raw.anti_detect import json_headers, throttle

SOURCE = "jobicy"
_DOMAIN = "jobicy.com"
_URL = "https://jobicy.com/api/v2/remote-jobs"
_RATE = 1.5


async def fetch(query: str = "", count: int = 50) -> list[dict]:
    """
    Returns raw job dicts from Jobicy.
    Each job dict contains: id, url, jobTitle, companyName, jobIndustry,
    jobType, jobGeo, jobLevel, jobExcerpt, jobDescription, pubDate, annualSalaryMin,
    annualSalaryMax, salaryCurrency.
    """
    params: dict = {"count": count, "geo": "usa"}
    if query:
        params["tag"] = query

    await throttle.wait(_DOMAIN, _RATE)
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(_URL, params=params, headers=json_headers())
        if resp.status_code != 200:
            print(f"[jobicy] HTTP {resp.status_code}")
            return []
        data = resp.json()
    except Exception as exc:
        print(f"[jobicy] request failed: {exc}")
        return []

    jobs = data.get("jobs", [])
    print(f"[jobicy] fetched {len(jobs)} jobs")
    return jobs
