import httpx

from config import settings
from scraper.adapters.base import BaseAdapter
from scraper.anti_detect.throttle import DomainThrottle
from scraper.models import ScrapedJob
from scraper.normalizer import normalize

_throttle = DomainThrottle()

_GQL_URL = "https://wellfound.com/graphql"

_QUERY = """
query JobSearchResults(
  $query: String
  $jobTypes: [String]
  $locationTypes: [String]
  $companyName: String
) {
  jobSearchResults(
    query: $query
    jobTypes: $jobTypes
    locationTypes: $locationTypes
    companyName: $companyName
  ) {
    startups {
      name
      jobs {
        title
        compensation
        remote
        locationNames
        liveStartAt
        jobUrl
        description
      }
    }
  }
}
"""


class WellfoundAdapter(BaseAdapter):
    """Adapter for Wellfound (AngelList) using its GraphQL API."""

    source = "wellfound"
    domain = "wellfound.com"
    rate_limit_seconds = 2.0

    async def search(
        self,
        keywords: str | None = None,
        company: str | None = None,
        max_age_hours: int = 24,
    ) -> list[ScrapedJob]:
        """Query Wellfound GraphQL API for job listings."""
        if not settings.WELLFOUND_SESSION:
            self._log("WELLFOUND_SESSION not set, skipping")
            return []

        payload = {
            "operationName": "JobSearchResults",
            "query": _QUERY,
            "variables": {
                "query": keywords or "",
                "jobTypes": ["full_time"],
                "locationTypes": ["remote", "onsite"],
                **({"companyName": company} if company else {}),
            },
        }

        headers = {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "Cookie": f"_session_id={settings.WELLFOUND_SESSION}",
        }

        jobs: list[ScrapedJob] = []

        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            await _throttle.wait(self.domain, self.rate_limit_seconds)
            try:
                response = await client.post(_GQL_URL, json=payload, headers=headers)
            except Exception as exc:
                self._log(f"request error: {exc}")
                return jobs

            if response.status_code != 200:
                self._log(f"status {response.status_code}")
                return jobs

            try:
                data = response.json()
            except Exception as exc:
                self._log(f"JSON parse error: {exc}")
                return jobs

        try:
            startups = data["data"]["jobSearchResults"]["startups"]
        except (KeyError, TypeError):
            self._log("unexpected response structure")
            return jobs

        for startup in startups:
            company_name = startup.get("name", "")
            for item in startup.get("jobs", []):
                location_names = item.get("locationNames") or []
                location = ", ".join(location_names) if location_names else ""

                is_remote = bool(item.get("remote", False))
                job_url = item.get("jobUrl", "")
                raw = {
                    "title": item.get("title"),
                    "company": company_name,
                    "location": location,
                    "source_id": str(item.get("id", "")) or job_url.rstrip("/").split("/")[-1],
                    "remote_raw": "Remote" if is_remote else location,
                    "salary_raw": item.get("compensation"),
                    "location_city": None,
                    "posted_at": item.get("liveStartAt"),
                    "source_url": job_url,
                    "description": item.get("description"),
                }
                job = normalize(raw, self.source, max_age_hours)
                if job:
                    jobs.append(job)

        self._log(f"found {len(jobs)} jobs")
        return jobs
