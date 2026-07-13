from urllib.parse import urlencode

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

from config import settings
from scraper.adapters.base import BaseAdapter
from scraper.anti_detect.browser_profile import get_stealth_context
from scraper.anti_detect.proxy_pool import ProxyPool
from scraper.anti_detect.throttle import DomainThrottle
from scraper.models import ScrapedJob
from scraper.normalizer import normalize

_throttle = DomainThrottle()

_SEARCH_URL = "https://www.linkedin.com/jobs/search/"
_MAX_SCROLL_PAGES = 3


class LinkedInAdapter(BaseAdapter):
    """
    Adapter for LinkedIn using a Playwright stealth browser.

    Injects the li_at session cookie, navigates to the job search page,
    scrolls up to MAX_SCROLL_PAGES times to trigger lazy-loaded results,
    then extracts job cards from the page HTML.
    """

    source = "linkedin"
    domain = "www.linkedin.com"
    rate_limit_seconds = 3.0

    async def search(
        self,
        keywords: str | None = None,
        company: str | None = None,
        max_age_hours: int = 24,
    ) -> list[ScrapedJob]:
        """Scrape LinkedIn job search results via a stealth browser session."""
        if not settings.LINKEDIN_LI_AT:
            self._log("LINKEDIN_LI_AT not set, skipping")
            return []

        params: dict[str, str] = {
            "keywords": keywords or "",
            "location": "United States",
            "f_TPR": "r86400",
        }
        url = f"{_SEARCH_URL}?{urlencode(params)}"

        proxy = ProxyPool().get()
        jobs: list[ScrapedJob] = []

        try:
            async with async_playwright() as pw:
                context = await get_stealth_context(pw, proxy=proxy)

                await context.add_cookies([{
                    "name": "li_at",
                    "value": settings.LINKEDIN_LI_AT,
                    "domain": ".linkedin.com",
                    "path": "/",
                }])

                page = context.pages[0] if context.pages else await context.new_page()

                await _throttle.wait(self.domain, self.rate_limit_seconds)
                response = await page.goto(url, wait_until="domcontentloaded", timeout=30_000)

                # Detect session-expired redirect or rate-limit
                if response and response.url and "linkedin.com/login" in response.url:
                    self._log("redirected to /login — session expired")
                    await context.close()
                    return jobs

                if response and response.status == 429:
                    self._log("rate limited (429)")
                    await context.close()
                    return jobs

                # Scroll to trigger lazy-loaded job cards
                prev_count = 0
                for _ in range(_MAX_SCROLL_PAGES):
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await _throttle.wait(self.domain, 1.5)

                    cards = await page.query_selector_all(".job-search-card")
                    if len(cards) == prev_count:
                        break
                    prev_count = len(cards)

                html = await page.content()
                await context.close()

            jobs = self._parse_cards(html, max_age_hours)

            # Client-side company filter (LinkedIn uses numeric IDs, not names)
            if company:
                jobs = [j for j in jobs if company.lower() in j.company.lower()]

        except Exception as exc:
            self._log(f"Playwright error: {exc}")

        self._log(f"found {len(jobs)} jobs")
        return jobs

    def _parse_cards(self, html: str, max_age_hours: int) -> list[ScrapedJob]:
        """Extract job data from .job-search-card elements in the page HTML."""
        soup = BeautifulSoup(html, "lxml")
        jobs: list[ScrapedJob] = []

        for card in soup.select(".job-search-card"):
            title_el = card.select_one(".job-search-card__title")
            company_el = card.select_one(".job-search-card__subtitle")
            location_el = card.select_one(".job-search-card__location")
            link_el = card.select_one("a.job-search-card__title-link")
            time_el = card.select_one("time[datetime]")

            location_text = location_el.get_text(strip=True) if location_el else ""
            source_url = link_el["href"] if link_el else ""
            raw = {
                "title": title_el.get_text(strip=True) if title_el else None,
                "company": company_el.get_text(strip=True) if company_el else None,
                "location": location_text,
                "source_id": source_url.rstrip("/").split("/")[-1],
                "remote_raw": location_text,
                "salary_raw": None,
                "location_city": None,
                "posted_at": time_el["datetime"] if time_el else None,
                "source_url": source_url,
                "description": None,
            }

            job = normalize(raw, self.source, max_age_hours)
            if job:
                jobs.append(job)

        return jobs
