from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import httpx
import pytest
import respx

from scraper.adapters.wellfound import WellfoundAdapter

_GQL_URL = "https://wellfound.com/graphql"


def _fresh_iso() -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")


def _old_iso() -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=48)).strftime("%Y-%m-%dT%H:%M:%SZ")


def _gql_response(live_start_at: str, count: int = 2) -> dict:
    jobs = [
        {
            "title": f"Senior Engineer {i}",
            "compensation": "120k-160k",
            "remote": True,
            "locationNames": ["New York", "Remote"],
            "liveStartAt": live_start_at,
            "jobUrl": f"https://wellfound.com/jobs/{i}",
            "description": "<p>Great role</p>",
        }
        for i in range(count)
    ]
    return {
        "data": {
            "jobSearchResults": {
                "startups": [
                    {"name": "Acme Corp", "jobs": jobs}
                ]
            }
        }
    }


@pytest.mark.asyncio
@respx.mock
async def test_wellfound_returns_jobs():
    """Fresh jobs from GraphQL response are normalised and returned."""
    respx.post(_GQL_URL).mock(return_value=httpx.Response(200, json=_gql_response(_fresh_iso())))
    with patch("scraper.adapters.wellfound.settings") as s:
        s.WELLFOUND_SESSION = "test-session"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = WellfoundAdapter()
        jobs = await adapter.search(None, None, 24)
    assert len(jobs) == 2
    assert all(j.source == "wellfound" for j in jobs)
    assert all(j.source_id != "" for j in jobs)
    assert all(j.work_type == "remote" for j in jobs)


@pytest.mark.asyncio
@respx.mock
async def test_wellfound_filters_old_jobs():
    """Jobs with liveStartAt older than max_age_hours are discarded."""
    respx.post(_GQL_URL).mock(return_value=httpx.Response(200, json=_gql_response(_old_iso())))
    with patch("scraper.adapters.wellfound.settings") as s:
        s.WELLFOUND_SESSION = "test-session"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = WellfoundAdapter()
        jobs = await adapter.search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
async def test_wellfound_no_session_returns_empty():
    """Returns empty list immediately when WELLFOUND_SESSION is not set."""
    with patch("scraper.adapters.wellfound.settings") as s:
        s.WELLFOUND_SESSION = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = WellfoundAdapter()
        jobs = await adapter.search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
@respx.mock
async def test_wellfound_handles_non_200():
    """Non-200 response returns empty list gracefully."""
    respx.post(_GQL_URL).mock(return_value=httpx.Response(401))
    with patch("scraper.adapters.wellfound.settings") as s:
        s.WELLFOUND_SESSION = "test-session"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = WellfoundAdapter()
        jobs = await adapter.search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
@respx.mock
async def test_wellfound_handles_unexpected_structure():
    """Malformed GraphQL response structure returns empty list."""
    respx.post(_GQL_URL).mock(return_value=httpx.Response(200, json={"data": {}}))
    with patch("scraper.adapters.wellfound.settings") as s:
        s.WELLFOUND_SESSION = "test-session"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = WellfoundAdapter()
        jobs = await adapter.search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
@respx.mock
async def test_wellfound_sends_session_cookie():
    """Session cookie is included in request headers."""
    captured = {}

    def handler(request):
        captured["cookie"] = request.headers.get("cookie", "")
        return httpx.Response(200, json=_gql_response(_fresh_iso(), count=0))

    respx.post(_GQL_URL).mock(side_effect=handler)
    with patch("scraper.adapters.wellfound.settings") as s:
        s.WELLFOUND_SESSION = "my-secret-session"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = WellfoundAdapter()
        await adapter.search(None, None, 24)
    assert "my-secret-session" in captured["cookie"]


@pytest.mark.asyncio
@respx.mock
async def test_wellfound_sends_company_in_variables():
    """Company name is included in GraphQL variables when provided."""
    captured = {}

    def handler(request):
        import json
        body = json.loads(request.content)
        captured["variables"] = body.get("variables", {})
        return httpx.Response(200, json=_gql_response(_fresh_iso(), count=0))

    respx.post(_GQL_URL).mock(side_effect=handler)
    with patch("scraper.adapters.wellfound.settings") as s:
        s.WELLFOUND_SESSION = "test-session"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = WellfoundAdapter()
        await adapter.search(None, "Stripe", 24)
    assert captured["variables"].get("companyName") == "Stripe"


@pytest.mark.asyncio
@respx.mock
async def test_wellfound_company_absent_when_none():
    """companyName key is absent from GraphQL variables when company=None."""
    captured = {}

    def handler(request):
        import json
        body = json.loads(request.content)
        captured["variables"] = body.get("variables", {})
        return httpx.Response(200, json=_gql_response(_fresh_iso(), count=0))

    respx.post(_GQL_URL).mock(side_effect=handler)
    with patch("scraper.adapters.wellfound.settings") as s:
        s.WELLFOUND_SESSION = "test-session"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = WellfoundAdapter()
        await adapter.search(None, None, 24)
    assert "companyName" not in captured["variables"]


@pytest.mark.asyncio
@respx.mock
async def test_wellfound_html_stripped_from_description():
    """HTML tags are stripped from job descriptions."""
    response = _gql_response(_fresh_iso(), count=1)
    response["data"]["jobSearchResults"]["startups"][0]["jobs"][0]["description"] = "<b>Exciting</b> role"
    respx.post(_GQL_URL).mock(return_value=httpx.Response(200, json=response))
    with patch("scraper.adapters.wellfound.settings") as s:
        s.WELLFOUND_SESSION = "test-session"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = WellfoundAdapter()
        jobs = await adapter.search(None, None, 24)
    assert len(jobs) == 1
    assert "<b>" not in (jobs[0].description_text or "")
    assert "Exciting" in (jobs[0].description_text or "")


@pytest.mark.asyncio
@respx.mock
async def test_wellfound_multiple_startups():
    """Jobs from multiple startups in response are all collected."""
    response = {
        "data": {
            "jobSearchResults": {
                "startups": [
                    {
                        "name": "Startup A",
                        "jobs": [{"title": "Engineer", "liveStartAt": _fresh_iso(),
                                  "remote": False, "locationNames": ["NYC"],
                                  "jobUrl": "https://wellfound.com/job/1",
                                  "description": None, "compensation": None}],
                    },
                    {
                        "name": "Startup B",
                        "jobs": [{"title": "Designer", "liveStartAt": _fresh_iso(),
                                  "remote": True, "locationNames": [],
                                  "jobUrl": "https://wellfound.com/job/2",
                                  "description": None, "compensation": None}],
                    },
                ]
            }
        }
    }
    respx.post(_GQL_URL).mock(return_value=httpx.Response(200, json=response))
    with patch("scraper.adapters.wellfound.settings") as s:
        s.WELLFOUND_SESSION = "test-session"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = WellfoundAdapter()
        jobs = await adapter.search(None, None, 24)
    assert len(jobs) == 2
    companies = {j.company for j in jobs}
    assert companies == {"Startup A", "Startup B"}
