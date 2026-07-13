"""
Wellfound (AngelList) — GraphQL API.
Requires WELLFOUND_SESSION cookie. Skips gracefully when absent.
"""
import httpx

from config import settings

SOURCE = "wellfound"
_GQL_URL = "https://wellfound.com/graphql"

_QUERY = """
query JobSearchResults(
  $query: String
  $jobTypes: [String]
  $locationTypes: [String]
) {
  jobSearchResults(
    query: $query
    jobTypes: $jobTypes
    locationTypes: $locationTypes
  ) {
    startups {
      name
      highConcept
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


async def fetch(query: str) -> list[dict]:
    """
    Returns raw job dicts. Each dict is one job listing with its company name
    merged in — exactly what the GraphQL response returned.
    """
    if not settings.WELLFOUND_SESSION:
        print("[wellfound] WELLFOUND_SESSION not set — skipping")
        return []

    payload = {
        "operationName": "JobSearchResults",
        "query": _QUERY,
        "variables": {
            "query": query,
            "jobTypes": ["full_time"],
            "locationTypes": ["remote", "onsite"],
        },
    }
    headers = {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Cookie": f"_session_id={settings.WELLFOUND_SESSION}",
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(_GQL_URL, json=payload, headers=headers)
        if resp.status_code != 200:
            print(f"[wellfound] HTTP {resp.status_code}")
            return []
        data = resp.json()
    except Exception as exc:
        print(f"[wellfound] request failed: {exc}")
        return []

    if "errors" in data:
        print(f"[wellfound] GraphQL errors: {data['errors']}")
        return []

    try:
        startups = data["data"]["jobSearchResults"]["startups"]
    except (KeyError, TypeError):
        print(f"[wellfound] unexpected response structure")
        return []

    jobs: list[dict] = []
    for startup in startups:
        company_name = startup.get("name", "")
        for job in startup.get("jobs", []):
            jobs.append({**job, "_company": company_name, "_company_concept": startup.get("highConcept")})

    print(f"[wellfound] fetched {len(jobs)} jobs")
    return jobs
