"""
Indeed adapter — Playwright-first.

Indeed aggressively blocks plain httpx requests (403/CAPTCHA). Playwright with
stealth patches, random user-agent, and a natural homepage visit before search
consistently bypasses the bot detection layer.
"""
import json
from urllib.parse import quote_plus

from scraper.adapters.playwright_base import PlaywrightBaseAdapter
from scraper.models import ScrapedJob
from scraper.normalizer import normalize

_INDEED_HOME = "https://www.indeed.com"
_INDEED_SEARCH = "https://www.indeed.com/jobs"


class IndeedAdapter(PlaywrightBaseAdapter):
    source = "indeed"
    domain = "www.indeed.com"
    rate_limit_seconds = 2.5

    # Natural homepage visit helps avoid the CAPTCHA gate
    home_url = _INDEED_HOME

    # ── PlaywrightBaseAdapter interface ───────────────────────────────────

    def _build_search_url(
        self,
        keywords: str | None,
        company: str | None,
        max_age_hours: int,
    ) -> str:
        query = keywords or ""
        if company:
            query += f' "{company}"'
        return f"{_INDEED_SEARCH}?q={quote_plus(query)}&l=United+States&fromage=1&sort=date"

    def _parse_page(
        self,
        html: str,
        captured: list[dict],
        max_age_hours: int,
    ) -> list[ScrapedJob]:
        if "captcha" in html.lower() or "are you a robot" in html.lower():
            self._log("CAPTCHA detected in page")
            return []

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
        script = soup.find("script", {"id": "mosaic-data"})
        if not script or not script.string:
            self._log("mosaic-data script tag not found")
            return []

        try:
            content = (script.string or "").strip()
            if "=" in content:
                content = content.split("=", 1)[1].strip()
            mosaic = json.loads(content)
        except (json.JSONDecodeError, TypeError) as exc:
            self._log(f"mosaic JSON parse error: {exc}")
            return []

        try:
            results = mosaic["mosaic"]["mosaic-provider-jobcards"]["data"]["results"]
        except (KeyError, TypeError):
            self._log("unexpected mosaic-data structure")
            return []

        jobs: list[ScrapedJob] = []
        for item in results:
            guid = item.get("jobkey") or item.get("guid", "")
            source_url = f"https://www.indeed.com/viewjob?jk={guid}" if guid else ""

            pub_date = item.get("pubDate")
            if isinstance(pub_date, (int, float)) and pub_date > 9_999_999_999:
                pub_date = pub_date // 1000

            location_parts = filter(None, [
                item.get("jobLocationCity"),
                item.get("jobLocationState"),
            ])
            location = ", ".join(location_parts) or item.get("formattedLocation", "")
            remote_text = (item.get("remoteWorkModel", {}) or {}).get("text", "")

            raw = {
                "title": item.get("displayTitle") or item.get("title"),
                "company": item.get("company"),
                "location": location,
                "source_id": guid,
                "remote_raw": remote_text if remote_text else location,
                "salary_raw": None,
                "location_city": item.get("jobLocationCity") or None,
                "posted_at": pub_date,
                "source_url": source_url,
                "description": item.get("snippet"),
            }
            job = normalize(raw, self.source, max_age_hours)
            if job:
                jobs.append(job)

        return jobs

    # ── public search entry point ─────────────────────────────────────────

    async def search(
        self,
        keywords: str | None = None,
        company: str | None = None,
        max_age_hours: int = 24,
    ) -> list[ScrapedJob]:
        jobs = await self._playwright_search(keywords, company, max_age_hours)
        self._log(f"found {len(jobs)} jobs")
        return jobs
