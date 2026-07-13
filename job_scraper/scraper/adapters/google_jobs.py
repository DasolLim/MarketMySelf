import json
from urllib.parse import quote_plus

from config import settings
from scraper.adapters.playwright_base import PlaywrightBaseAdapter
from scraper.anti_detect.throttle import DomainThrottle
from scraper.models import ScrapedJob
from scraper.normalizer import normalize

_throttle = DomainThrottle()


class GoogleJobsAdapter(PlaywrightBaseAdapter):
    """
    Google Jobs adapter.

    Uses SerpAPI when SERPAPI_KEY is configured; otherwise falls back to a
    Playwright stealth browser that extracts JobPosting JSON-LD blocks from
    the Google Jobs search panel.
    """

    source = "google_jobs"
    domain = "www.google.com"
    rate_limit_seconds = 2.0

    wait_selector = "[data-ved]"

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
        return f"https://www.google.com/search?q={quote_plus(query + ' jobs hiring')}&ibp=htl;jobs"

    def _parse_page(
        self,
        html: str,
        captured: list[dict],
        max_age_hours: int,
    ) -> list[ScrapedJob]:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
        jobs: list[ScrapedJob] = []

        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
            except (json.JSONDecodeError, TypeError):
                continue

            blocks = data if isinstance(data, list) else [data]
            for block in blocks:
                if block.get("@type") != "JobPosting":
                    continue

                location = block.get("jobLocation") or {}
                if isinstance(location, list):
                    location = location[0] if location else {}
                address = location.get("address") or {} if isinstance(location, dict) else {}
                loc_str = ", ".join(filter(None, [
                    address.get("addressLocality") if isinstance(address, dict) else None,
                    address.get("addressRegion") if isinstance(address, dict) else None,
                ]))

                job_url = block.get("url", "")
                raw = {
                    "title": block.get("title"),
                    "company": (block.get("hiringOrganization") or {}).get("name"),
                    "location": loc_str,
                    "source_id": job_url.rstrip("/").split("/")[-1],
                    "remote_raw": loc_str,
                    "salary_raw": None,
                    "location_city": address.get("addressLocality") if isinstance(address, dict) else None,
                    "posted_at": block.get("datePosted"),
                    "source_url": job_url,
                    "description": block.get("description"),
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
        if settings.SERPAPI_KEY:
            jobs = await self._search_serpapi(keywords, company, max_age_hours)
        else:
            jobs = await self._playwright_search(keywords, company, max_age_hours)

        self._log(f"found {len(jobs)} jobs")
        return jobs

    # ── SerpAPI path ──────────────────────────────────────────────────────

    async def _search_serpapi(
        self,
        keywords: str | None,
        company: str | None,
        max_age_hours: int,
    ) -> list[ScrapedJob]:
        try:
            from serpapi import GoogleSearch  # type: ignore[import]
        except ImportError:
            self._log("serpapi package not installed, falling back to Playwright")
            return await self._playwright_search(keywords, company, max_age_hours)

        query = keywords or ""
        if company:
            query += f" {company}"

        params = {
            "engine": "google_jobs",
            "q": query,
            "chips": "date_posted:today",
            "location": "United States",
            "api_key": settings.SERPAPI_KEY,
        }

        jobs: list[ScrapedJob] = []
        try:
            await _throttle.wait(self.domain, self.rate_limit_seconds)
            search = GoogleSearch(params)
            results = search.get_dict()
        except Exception as exc:
            self._log(f"SerpAPI error: {exc}")
            return jobs

        for item in results.get("jobs_results", []):
            ext = item.get("detected_extensions") or {}
            loc = item.get("location") or ""
            share_link = item.get("share_link", "")
            src_id = item.get("job_id") or share_link.rstrip("/").split("/")[-1]
            raw = {
                "title": item.get("title"),
                "company": item.get("company_name"),
                "location": loc,
                "source_id": src_id,
                "remote_raw": loc,
                "salary_raw": ext.get("salary"),
                "location_city": None,
                "posted_at": ext.get("posted_at"),
                "source_url": share_link,
                "description": self._extract_highlights(item.get("job_highlights")),
            }
            job = normalize(raw, self.source, max_age_hours)
            if job:
                jobs.append(job)

        return jobs

    def _extract_highlights(self, highlights: list | None) -> str | None:
        if not highlights:
            return None
        parts: list[str] = []
        for section in highlights:
            if isinstance(section, dict):
                parts.extend(section.get("items") or [])
        return " ".join(parts) if parts else None
