"""
Dice — curl_cffi fetch of the server-rendered Next.js page.

Uses curl_cffi with Chrome TLS impersonation so the handshake is
indistinguishable from a real browser. The job data lives in RSC push
chunks already present in the initial HTML; no JS execution required.
"""
import json
import re
from urllib.parse import quote_plus

from curl_cffi.requests import AsyncSession

from scraper.raw.anti_detect import browser_headers, throttle

SOURCE = "dice"
_DOMAIN = "www.dice.com"
_BASE = "https://www.dice.com/jobs"
# Minimum seconds between requests to dice.com — jitter doubles the upper bound
_RATE = 2.0


async def fetch(query: str, page: int = 1) -> list[dict]:
    """
    Returns raw job dicts from Dice's RSC payload.
    Each dict is exactly as Dice embedded it — no field mapping.
    """
    url = (
        f"{_BASE}?q={quote_plus(query)}"
        f"&location=United+States&datePosted=one&page={page}"
    )
    headers = browser_headers(referer="https://www.dice.com/")

    await throttle.wait(_DOMAIN, _RATE)

    try:
        async with AsyncSession(impersonate="chrome124") as session:
            resp = await session.get(url, headers=headers, timeout=30)
        if resp.status_code != 200:
            print(f"[dice] HTTP {resp.status_code}")
            return []
        html = resp.text
    except Exception as exc:
        print(f"[dice] request failed: {exc}")
        return []

    jobs = _extract_job_list(html)
    print(f"[dice] parsed {len(jobs)} jobs from RSC (page {page})")
    return jobs


def _extract_job_list(html: str) -> list[dict]:
    """Pull the jobList.data array from Dice's Next.js RSC push chunks."""
    chunks = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', html, re.DOTALL)

    combined = ""
    for chunk in chunks:
        try:
            combined += chunk.encode().decode("unicode_escape")
        except Exception:
            combined += chunk

    marker = re.search(r'"jobList"\s*:\s*\{"data"\s*:\s*\[', combined)
    if not marker:
        return []

    start = combined.index("[", marker.start())
    depth = 0
    for i, ch in enumerate(combined[start:], start):
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(combined[start: i + 1])
                except json.JSONDecodeError:
                    return []

    return []
