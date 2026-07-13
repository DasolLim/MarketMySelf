"""
RareRoles.com — direct HTML scrape.
Curated list of niche, hard-to-find roles. No auth required.
"""
import httpx
from bs4 import BeautifulSoup

SOURCE = "rareroles"
_URL = "https://rareroles.com"
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
    Scrapes job listings from RareRoles. Returns raw dicts with whatever
    fields the HTML exposes — title, company, url, location, tags.
    """
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(_URL, headers=_HEADERS)
        if resp.status_code != 200:
            print(f"[rareroles] HTTP {resp.status_code}")
            return []
        html = resp.text
    except Exception as exc:
        print(f"[rareroles] request failed: {exc}")
        return []

    return _parse(html)


def _parse(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    jobs: list[dict] = []

    # RareRoles uses a card-based layout — each job is in a <a> or <article>
    # Try multiple selectors to handle site structure changes gracefully.
    cards = (
        soup.select("a[href*='/jobs/']")
        or soup.select("article")
        or soup.select(".job-card, .job-listing, .job-row, [class*='job']")
    )

    seen_urls: set[str] = set()
    for card in cards:
        href = card.get("href", "")
        if not href or href in seen_urls:
            continue
        seen_urls.add(href)

        url = href if href.startswith("http") else f"https://rareroles.com{href}"
        title = _text(card, "h2, h3, h4, .title, [class*='title']") or card.get_text(strip=True)[:120]
        company = _text(card, ".company, [class*='company'], [class*='org']")
        location = _text(card, ".location, [class*='location'], [class*='remote']")
        tags = [t.get_text(strip=True) for t in card.select(".tag, [class*='tag'], [class*='badge']")]

        if not title:
            continue

        jobs.append({
            "url": url,
            "title": title,
            "company": company,
            "location": location,
            "tags": tags,
        })

    print(f"[rareroles] parsed {len(jobs)} jobs")
    return jobs


def _text(tag, selector: str) -> str | None:
    el = tag.select_one(selector)
    return el.get_text(strip=True) if el else None
