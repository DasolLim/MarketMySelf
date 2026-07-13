"""
StillHiring.today — direct HTML scrape.
Lists companies actively posting jobs. No auth required.
"""
import httpx
from bs4 import BeautifulSoup

SOURCE = "stillhiring"
_URL = "https://stillhiring.today"
_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
}


async def fetch(query: str = "") -> list[dict]:
    """
    Scrapes company/job entries from StillHiring. Returns raw dicts with
    company name, url, and whatever metadata the page exposes.
    """
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(_URL, headers=_HEADERS)
        if resp.status_code != 200:
            print(f"[stillhiring] HTTP {resp.status_code}")
            return []
        html = resp.text
    except Exception as exc:
        print(f"[stillhiring] request failed: {exc}")
        return []

    return _parse(html)


def _parse(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    entries: list[dict] = []

    # StillHiring renders a list/grid of companies with links to their job pages.
    # Selectors ordered from most to least specific.
    rows = (
        soup.select("tr, .company-row, [class*='company']")
        or soup.select("li")
        or soup.select("a[href*='jobs'], a[href*='career']")
    )

    seen: set[str] = set()
    for row in rows:
        link = row.find("a") if row.name != "a" else row
        if not link:
            continue

        href = link.get("href", "")
        if not href or href in seen:
            continue
        seen.add(href)

        name = link.get_text(strip=True) or row.get_text(strip=True)[:120]
        if not name:
            continue

        tags = [t.get_text(strip=True) for t in row.select(".tag, [class*='tag'], [class*='badge'], span")]
        note = _text(row, "p, .note, [class*='description']")

        entries.append({
            "url": href,
            "company": name,
            "tags": tags[:10],
            "note": note,
        })

    print(f"[stillhiring] parsed {len(entries)} entries")
    return entries


def _text(tag, selector: str) -> str | None:
    el = tag.select_one(selector)
    return el.get_text(strip=True) if el else None
