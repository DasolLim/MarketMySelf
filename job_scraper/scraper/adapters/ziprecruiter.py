import json
from urllib.parse import urlencode

import httpx

from config import settings
from scraper.adapters.playwright_base import PlaywrightBaseAdapter
from scraper.anti_detect.throttle import DomainThrottle
from scraper.models import ScrapedJob
from scraper.normalizer import normalize

_throttle = DomainThrottle()

_API_URL = "https://api.ziprecruiter.com/jobs/search"
_SCRAPE_URL = "https://www.ziprecruiter.com/jobs-search"


class ZipRecruiterAdapter(PlaywrightBaseAdapter):
    """
    ZipRecruiter adapter.

    Uses the official REST API when ZIPRECRUITER_API_KEY is set; otherwise
    falls back to Playwright stealth scraping of the Apollo-state JSON embedded
    in the search page HTML.
    """

    source = "ziprecruiter"
    domain = "www.ziprecruiter.com"
    rate_limit_seconds = 2.0

    wait_selector = 'script[type="application/json"][data-js="job-search-apollo-state"]'

    # ── PlaywrightBaseAdapter interface ───────────────────────────────────

    def _build_search_url(
        self,
        keywords: str | None,
        company: str | None,
        max_age_hours: int,
    ) -> str:
        return f"{_SCRAPE_URL}?{urlencode({'search': keywords or '', 'location': 'United States', 'days': 1})}"

    def _parse_page(
        self,
        html: str,
        captured: list[dict],
        max_age_hours: int,
    ) -> list[ScrapedJob]:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
        script = soup.find(
            "script",
            {"type": "application/json", "data-js": "job-search-apollo-state"},
        )
        if not script or not script.string:
            self._log("Apollo state script tag not found")
            return []

        try:
            apollo = json.loads(script.string)
        except (json.JSONDecodeError, TypeError) as exc:
            self._log(f"Apollo JSON parse error: {exc}")
            return []

        jobs: list[ScrapedJob] = []
        for item in apollo.values():
            if not isinstance(item, dict) or item.get("__typename") != "Job":
                continue
            jobs.extend(self._normalise_item(item, max_age_hours))
        return jobs

    # ── public search entry point ─────────────────────────────────────────

    async def search(
        self,
        keywords: str | None = None,
        company: str | None = None,
        max_age_hours: int = 24,
    ) -> list[ScrapedJob]:
        if settings.ZIPRECRUITER_API_KEY:
            jobs = await self._search_api(keywords or "", max_age_hours)
        else:
            jobs = await self._playwright_search(keywords, company, max_age_hours)

        if company:
            jobs = [j for j in jobs if company.lower() in j.company.lower()]

        self._log(f"found {len(jobs)} jobs")
        return jobs

    # ── API path ──────────────────────────────────────────────────────────

    async def _search_api(self, query: str, max_age_hours: int) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            await _throttle.wait(self.domain, self.rate_limit_seconds)
            try:
                response = await client.get(
                    _API_URL,
                    params={
                        "search": query,
                        "location": "United States",
                        "days_ago": 1,
                        "api_key": settings.ZIPRECRUITER_API_KEY,
                        "jobs_per_page": 50,
                    },
                )
            except Exception as exc:
                self._log(f"API request error: {exc}")
                return jobs

            if response.status_code != 200:
                self._log(f"API returned status {response.status_code}")
                return jobs

            try:
                data = response.json()
            except Exception as exc:
                self._log(f"API JSON parse error: {exc}")
                return jobs

            for item in data.get("jobs", []):
                jobs.extend(self._normalise_item(item, max_age_hours))

        return jobs

    # ── shared normaliser ─────────────────────────────────────────────────

    def _normalise_item(self, item: dict, max_age_hours: int) -> list[ScrapedJob]:
        hiring = item.get("hiring_company") or {}
        company_name = hiring.get("name") if isinstance(hiring, dict) else None

        sal_min = item.get("salary_min") or item.get("compensation_min")
        sal_max = item.get("salary_max") or item.get("compensation_max")
        is_remote = bool(item.get("remote_ok") or item.get("remote"))
        location = item.get("job_location") or item.get("location") or ""
        job_url = item.get("job_url") or item.get("url", "")
        src_id = str(item.get("id", "")) or job_url.rstrip("/").split("/")[-1]

        raw = {
            "title": item.get("name") or item.get("title"),
            "company": company_name or item.get("buyer_company_name"),
            "location": location,
            "source_id": src_id,
            "remote_raw": "Remote" if is_remote else location,
            "salary_raw": None,
            "location_city": None,
            "posted_at": item.get("posted_time") or item.get("posted_at"),
            "source_url": job_url,
            "description": item.get("snippet") or item.get("description"),
            "salary_min": int(sal_min) if sal_min is not None else None,
            "salary_max": int(sal_max) if sal_max is not None else None,
        }
        job = normalize(raw, self.source, max_age_hours)
        return [job] if job else []
