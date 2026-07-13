"""
Dice adapter — Playwright-first.

Dice serves its job data inside Next.js RSC push chunks embedded in the HTML.
Plain httpx is increasingly rate-limited; Playwright with stealth patches
reliably renders the page and exposes those chunks for extraction.
"""
import json
import re
from urllib.parse import quote_plus

from scraper.adapters.playwright_base import PlaywrightBaseAdapter
from scraper.models import ScrapedJob
from scraper.normalizer import normalize

_DICE_URL = "https://www.dice.com/jobs"


class DiceAdapter(PlaywrightBaseAdapter):
    source = "dice"
    domain = "www.dice.com"
    rate_limit_seconds = 2.0

    # ── PlaywrightBaseAdapter interface ───────────────────────────────────

    def _build_search_url(
        self,
        keywords: str | None,
        company: str | None,
        max_age_hours: int,
    ) -> str:
        query = keywords or ""
        if company:
            query += f" {company}"
        return f"{_DICE_URL}?q={quote_plus(query)}&location=United+States&datePosted=one&page=1"

    def _parse_page(
        self,
        html: str,
        captured: list[dict],
        max_age_hours: int,
    ) -> list[ScrapedJob]:
        items = self._extract_job_list(html)
        if not items:
            self._log("no jobList data found in page")
            return []

        jobs: list[ScrapedJob] = []
        for item in items:
            loc = item.get("jobLocation") or {}
            location = loc.get("displayName", "") if isinstance(loc, dict) else str(loc)

            workplace = item.get("workplaceTypes") or []
            is_remote = any("remote" in str(w).lower() for w in workplace)

            raw = {
                "title": item.get("title") or item.get("jobTitle"),
                "company": item.get("companyName"),
                "location": location,
                "source_id": item.get("id") or item.get("guid", ""),
                "remote_raw": "Remote" if is_remote else location,
                "salary_raw": None,
                "location_city": None if is_remote else location.split(",")[0].strip() or None,
                "posted_at": item.get("postedDate"),
                "source_url": item.get("detailsPageUrl", ""),
                "description": item.get("summary"),
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

    # ── RSC chunk extractor ───────────────────────────────────────────────

    def _extract_job_list(self, html: str) -> list[dict]:
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
                        return json.loads(combined[start : i + 1])
                    except json.JSONDecodeError:
                        return []

        return []
