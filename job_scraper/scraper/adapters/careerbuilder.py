import json
from urllib.parse import urlencode

from scraper.adapters.playwright_base import PlaywrightBaseAdapter
from scraper.models import ScrapedJob
from scraper.normalizer import normalize

_CB_URL = "https://www.careerbuilder.com/jobs"


class CareerBuilderAdapter(PlaywrightBaseAdapter):
    source = "careerbuilder"
    domain = "www.careerbuilder.com"
    rate_limit_seconds = 2.0

    wait_selector = 'script[type="application/ld+json"]'

    def _build_search_url(
        self,
        keywords: str | None,
        company: str | None,
        max_age_hours: int,
    ) -> str:
        params: dict[str, str] = {
            "keywords": keywords or "",
            "posted": "today",
        }
        if company:
            params["company_name"] = company
        return f"{_CB_URL}?{urlencode(params)}"

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

                salary = block.get("baseSalary", {})
                salary_value = salary.get("value", {}) if isinstance(salary, dict) else {}
                sal_min = salary_value.get("minValue") if isinstance(salary_value, dict) else None
                sal_max = salary_value.get("maxValue") if isinstance(salary_value, dict) else None

                location = block.get("jobLocation", {})
                if isinstance(location, list):
                    location = location[0] if location else {}
                address = location.get("address", {}) if isinstance(location, dict) else {}
                if isinstance(address, dict):
                    loc_str = ", ".join(
                        filter(None, [address.get("addressLocality"), address.get("addressRegion")])
                    )
                else:
                    loc_str = str(address)

                job_url = block.get("url", "")
                src_id = (
                    (block.get("identifier") or {}).get("value")
                    if isinstance(block.get("identifier"), dict) else None
                )
                if not src_id:
                    src_id = job_url.rstrip("/").split("/")[-1]

                raw = {
                    "title": block.get("title"),
                    "company": (block.get("hiringOrganization") or {}).get("name"),
                    "location": loc_str,
                    "source_id": src_id,
                    "remote_raw": loc_str,
                    "salary_raw": None,
                    "location_city": address.get("addressLocality") if isinstance(address, dict) else None,
                    "posted_at": block.get("datePosted"),
                    "source_url": job_url,
                    "description": block.get("description"),
                    "salary_min": int(sal_min) if sal_min is not None else None,
                    "salary_max": int(sal_max) if sal_max is not None else None,
                }
                job = normalize(raw, self.source, max_age_hours)
                if job:
                    jobs.append(job)

        return jobs

    async def search(
        self,
        keywords: str | None = None,
        company: str | None = None,
        max_age_hours: int = 24,
    ) -> list[ScrapedJob]:
        jobs = await self._playwright_search(keywords, company, max_age_hours)
        self._log(f"found {len(jobs)} jobs")
        return jobs
