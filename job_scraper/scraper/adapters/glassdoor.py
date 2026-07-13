"""
Glassdoor adapter — extends PlaywrightBaseAdapter.

Glassdoor-specific additions on top of the shared anti-detection engine:
  home_url         → visit glassdoor.com homepage first (natural browsing path)
  intercept_path   → capture /graph responses to prefer Glassdoor's own GQL data
  _session_cookies → inject GSESSIONID when GLASSDOOR_SESSION is configured
  _gql_fallback    → httpx GraphQL call as absolute last resort when Playwright fails
"""
import asyncio
import random
from datetime import datetime, timedelta, timezone

import httpx

from config import settings
from scraper.adapters.playwright_base import PlaywrightBaseAdapter
from scraper.anti_detect.browser_profile import CHROME_USER_AGENTS
from scraper.anti_detect.throttle import DomainThrottle
from scraper.deduplicator import make_id
from scraper.models import ScrapedJob
from scraper.normalizer import strip_html

_throttle = DomainThrottle()

_HOME_URL = "https://www.glassdoor.com"
_SEARCH_URL = "https://www.glassdoor.com/Job/jobs.htm"
_GRAPH_URL = "https://www.glassdoor.com/graph"

_GQL_QUERY = """
query JobsSearchResultsQuery(
  $keyword: String
  $locationId: Int
  $numJobsToShow: Int
  $fromAge: Int
) {
  jobListings(
    contextHolder: {
      searchParams: {
        keyword: $keyword
        locationId: $locationId
        numJobsToShow: $numJobsToShow
        fromAge: $fromAge
      }
    }
  ) {
    jobListings {
      jobview {
        job { jobTitleText listingId descriptionFragments }
        header { employerNameFromSearch locationsText ageInDays }
      }
    }
  }
}
"""


class GlassdoorAdapter(PlaywrightBaseAdapter):
    source = "glassdoor"
    domain = "www.glassdoor.com"
    rate_limit_seconds = 3.5

    home_url = _HOME_URL
    intercept_path = "/graph"

    # ── PlaywrightBaseAdapter interface ───────────────────────────────────

    def _build_search_url(
        self,
        keywords: str | None,
        company: str | None,
        max_age_hours: int,
    ) -> str:
        query = (keywords or "software engineer").strip().replace(" ", "%20")
        return f"{_SEARCH_URL}?keyword={query}&fromAge=1&sortBy=date"

    def _parse_page(
        self,
        html: str,
        captured: list[dict],
        max_age_hours: int,
    ) -> list[ScrapedJob]:
        # Prefer captured GQL responses (Glassdoor's own data, most reliable)
        jobs: list[ScrapedJob] = []
        for payload in captured:
            jobs.extend(self._parse_gql_payload(payload, max_age_hours))
        if jobs:
            return jobs
        # Fall back to HTML card parsing
        return self._parse_html_cards(html, max_age_hours)

    def _session_cookies(self) -> list[dict]:
        if not settings.GLASSDOOR_SESSION:
            return []
        return [{
            "name": "GSESSIONID",
            "value": settings.GLASSDOOR_SESSION,
            "domain": ".glassdoor.com",
            "path": "/",
            "secure": True,
            "sameSite": "None",
        }]

    # ── public search entry point ─────────────────────────────────────────

    async def search(
        self,
        keywords: str | None = None,
        company: str | None = None,
        max_age_hours: int = 24,
    ) -> list[ScrapedJob]:
        jobs = await self._playwright_search(keywords, company, max_age_hours)
        if not jobs:
            jobs = await self._gql_fallback(keywords, max_age_hours)
        if company:
            jobs = [j for j in jobs if company.lower() in j.company.lower()]
        self._log(f"found {len(jobs)} jobs")
        return jobs

    # ── Glassdoor-specific parsers ────────────────────────────────────────

    def _parse_gql_payload(self, data: dict, max_age_hours: int) -> list[ScrapedJob]:
        jobs: list[ScrapedJob] = []
        now = datetime.now(timezone.utc)
        try:
            listings = data["data"]["jobListings"]["jobListings"]
        except (KeyError, TypeError):
            return jobs

        for listing in listings:
            try:
                jobview = listing.get("jobview") or {}
                job_info = jobview.get("job") or {}
                header = jobview.get("header") or {}

                age_in_days = header.get("ageInDays")
                if age_in_days is None:
                    continue
                posted_at = now - timedelta(days=float(age_in_days))
                if (now - posted_at).total_seconds() > max_age_hours * 3600:
                    continue

                listing_id = job_info.get("listingId", "")
                source_url = (
                    f"https://www.glassdoor.com/job-listing/?jl={listing_id}"
                    if listing_id else ""
                )
                fragments = job_info.get("descriptionFragments") or []
                raw_desc = (
                    " ".join(fragments) if isinstance(fragments, list)
                    else str(fragments)
                )
                title = job_info.get("jobTitleText", "").strip()
                company_name = header.get("employerNameFromSearch", "").strip()
                if not title or not company_name:
                    continue

                jobs.append(ScrapedJob(
                    id=make_id(title, company_name, source_url),
                    source=self.source,
                    source_id=str(listing_id),
                    source_url=source_url,
                    title=title,
                    company=company_name,
                    remote_raw=header.get("locationsText", "").strip(),
                    experience_level=None,
                    posted_at=posted_at,
                    description=raw_desc or None,
                    description_text=strip_html(raw_desc) or None,
                ))
            except Exception as exc:
                self._log(f"GQL listing parse error: {exc}")

        return jobs

    def _parse_html_cards(self, html: str, max_age_hours: int) -> list[ScrapedJob]:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
        jobs: list[ScrapedJob] = []
        now = datetime.now(timezone.utc)

        cards = (
            soup.select("[data-test='jobListing']")
            or soup.select("li.react-job-listing")
            or soup.select("[class*='JobsList_jobListItem']")
        )

        for card in cards:
            try:
                title_el = (
                    card.select_one("[data-test='job-title']")
                    or card.select_one("a[class*='JobCard_seoLink']")
                    or card.select_one("a[href*='job-listing']")
                )
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                href = title_el.get("href", "")
                source_url = (
                    f"https://www.glassdoor.com{href}"
                    if href.startswith("/") else href
                )

                company_el = (
                    card.select_one("[data-test='employer-name']")
                    or card.select_one("[data-test='emp-name']")
                    or card.select_one("[class*='EmployerProfile']")
                )
                company_name = company_el.get_text(strip=True) if company_el else ""
                if not company_name:
                    continue

                location_el = (
                    card.select_one("[data-test='emp-location']")
                    or card.select_one("[data-test='job-location']")
                    or card.select_one("[class*='JobCard_location']")
                )
                location = location_el.get_text(strip=True) if location_el else ""

                age_el = (
                    card.select_one("[data-test='job-age']")
                    or card.select_one("[data-test='listing-age']")
                    or card.select_one("[class*='JobCard_listingAge']")
                )
                posted_at = self._parse_age_text(
                    age_el.get_text(strip=True) if age_el else "", now
                )
                if posted_at and (now - posted_at).total_seconds() > max_age_hours * 3600:
                    continue

                jobs.append(ScrapedJob(
                    id=make_id(title, company_name, source_url),
                    source=self.source,
                    source_id=source_url.rstrip("/").split("/")[-1],
                    source_url=source_url,
                    title=title,
                    company=company_name,
                    remote_raw=location,
                    location_city=location.split(",")[0].strip() if "," in location else None,
                    experience_level=None,
                    posted_at=posted_at or now,
                    description=None,
                    description_text=None,
                ))
            except Exception as exc:
                self._log(f"HTML card parse error: {exc}")

        return jobs

    def _parse_age_text(self, text: str, now: datetime) -> datetime | None:
        text = text.lower().strip()
        if not text or "30+" in text:
            return None
        if any(w in text for w in ("just now", "just posted", "today", "hour")):
            return now
        if "yesterday" in text:
            return now - timedelta(days=1)
        for part in text.split():
            clean = part.rstrip("d").replace("days", "").replace("day", "").strip()
            if clean.isdigit():
                return now - timedelta(days=int(clean))
        return None

    # ── httpx GraphQL fallback (absolute last resort) ─────────────────────

    async def _gql_fallback(
        self,
        keywords: str | None,
        max_age_hours: int,
    ) -> list[ScrapedJob]:
        keyword = keywords or ""
        payload = {
            "operationName": "JobsSearchResultsQuery",
            "query": _GQL_QUERY,
            "variables": {
                "keyword": keyword,
                "locationId": 0,
                "numJobsToShow": 30,
                "fromAge": 1,
            },
        }

        jobs: list[ScrapedJob] = []
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            headers = await self._build_gql_headers(client)
            await _throttle.wait(self.domain, self.rate_limit_seconds)
            try:
                response = await client.post(_GRAPH_URL, json=payload, headers=headers)
            except Exception as exc:
                self._log(f"GQL fallback request error: {exc}")
                return jobs

            if response.status_code != 200:
                self._log(f"GQL fallback status {response.status_code}")
                return jobs

            try:
                data = response.json()
            except Exception as exc:
                self._log(f"GQL fallback JSON error: {exc}")
                return jobs

        return self._parse_gql_payload(data, max_age_hours)

    async def _build_gql_headers(self, client: httpx.AsyncClient) -> dict:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": random.choice(CHROME_USER_AGENTS),
            "Referer": "https://www.glassdoor.com/",
            "Origin": "https://www.glassdoor.com",
        }
        if settings.GLASSDOOR_SESSION:
            headers["Cookie"] = f"GSESSIONID={settings.GLASSDOOR_SESSION}"
            return headers
        try:
            await _throttle.wait(self.domain, self.rate_limit_seconds)
            resp = await client.get(
                _SEARCH_URL,
                headers={"User-Agent": random.choice(CHROME_USER_AGENTS)},
            )
            csrf = resp.cookies.get("gdId") or ""
            if csrf:
                headers["gd-csrf-token"] = csrf
        except Exception as exc:
            self._log(f"CSRF fetch error: {exc}")
        return headers
