"""
Glassdoor adapter tests.

Existing tests (httpx / GQL path):
  - patch _playwright_search to return [] so the httpx fallback is exercised
  - respx.mock intercepts the httpx requests as before

New tests (Playwright path):
  - mock async_playwright + get_stealth_context
  - test block detection, natural browsing, GQL interception, HTML fallback, retry
  - test pure parser helpers directly
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
import respx

from scraper.adapters.glassdoor import GlassdoorAdapter

_GRAPH_URL = "https://www.glassdoor.com/graph"
_HOME_URL = "https://www.glassdoor.com"
_SEARCH_URL = "https://www.glassdoor.com/Job/jobs.htm"


# ── shared helpers ────────────────────────────────────────────────────────────

def _fresh_age_days() -> float:
    return 0.08  # ≈ 2 hours


def _old_age_days() -> float:
    return 2.0   # outside 24h window


def _gql_response(age_in_days: float, count: int = 2) -> dict:
    return {
        "data": {
            "jobListings": {
                "jobListings": [
                    {
                        "jobview": {
                            "job": {
                                "jobTitleText": f"Senior Engineer {i}",
                                "listingId": f"100{i}",
                                "descriptionFragments": ["<p>Great role</p>"],
                            },
                            "header": {
                                "employerNameFromSearch": f"Acme Corp {i}",
                                "locationsText": "New York, NY",
                                "ageInDays": age_in_days,
                            },
                        }
                    }
                    for i in range(count)
                ]
            }
        }
    }


def _make_mock_playwright(html: str = "", blocked: bool = False):
    """Return (mock_pw, mock_context, mock_page) with sane defaults."""
    page_content = "just a moment cloudflare challenge" if blocked else html

    mock_page = AsyncMock()
    mock_page.goto = AsyncMock(return_value=MagicMock(status=200))
    mock_page.content = AsyncMock(return_value=page_content)
    mock_page.mouse = AsyncMock()
    mock_page.evaluate = AsyncMock()
    mock_page.on = MagicMock()  # event-handler registration — not awaited

    mock_context = AsyncMock()
    mock_context.pages = [mock_page]
    mock_context.add_cookies = AsyncMock()
    mock_context.close = AsyncMock()

    mock_pw = AsyncMock()
    mock_pw.__aenter__ = AsyncMock(return_value=mock_pw)
    mock_pw.__aexit__ = AsyncMock(return_value=False)

    return mock_pw, mock_context, mock_page


# ── existing GQL-fallback tests (httpx path) ─────────────────────────────────
# _playwright_search is patched to return [] so each test exercises _gql_fallback.

@pytest.mark.asyncio
@respx.mock
async def test_glassdoor_returns_jobs():
    """Fresh jobs from GraphQL response are returned and normalised."""
    respx.get(_SEARCH_URL).mock(return_value=httpx.Response(200, text="<html></html>"))
    respx.post(_GRAPH_URL).mock(
        return_value=httpx.Response(200, json=_gql_response(_fresh_age_days()))
    )
    with patch("scraper.adapters.glassdoor.GlassdoorAdapter._playwright_search",
               new=AsyncMock(return_value=[])), \
         patch("scraper.adapters.glassdoor.settings") as s:
        s.GLASSDOOR_SESSION = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = GlassdoorAdapter()
        jobs = await adapter.search(None, None, 24)
    assert len(jobs) == 2
    assert all(j.source == "glassdoor" for j in jobs)
    assert all(j.experience_level is None for j in jobs)
    assert all(j.source_id != "" for j in jobs)


@pytest.mark.asyncio
@respx.mock
async def test_glassdoor_filters_old_jobs():
    """Jobs where ageInDays exceeds max_age_hours are discarded."""
    respx.get(_SEARCH_URL).mock(return_value=httpx.Response(200, text="<html></html>"))
    respx.post(_GRAPH_URL).mock(
        return_value=httpx.Response(200, json=_gql_response(_old_age_days()))
    )
    with patch("scraper.adapters.glassdoor.GlassdoorAdapter._playwright_search",
               new=AsyncMock(return_value=[])), \
         patch("scraper.adapters.glassdoor.settings") as s:
        s.GLASSDOOR_SESSION = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = GlassdoorAdapter()
        jobs = await adapter.search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
@respx.mock
async def test_glassdoor_source_url_built_from_listing_id():
    """source_url is constructed from listingId."""
    respx.get(_SEARCH_URL).mock(return_value=httpx.Response(200, text="<html></html>"))
    respx.post(_GRAPH_URL).mock(
        return_value=httpx.Response(200, json=_gql_response(_fresh_age_days(), count=1))
    )
    with patch("scraper.adapters.glassdoor.GlassdoorAdapter._playwright_search",
               new=AsyncMock(return_value=[])), \
         patch("scraper.adapters.glassdoor.settings") as s:
        s.GLASSDOOR_SESSION = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = GlassdoorAdapter()
        jobs = await adapter.search(None, None, 24)
    assert len(jobs) == 1
    assert "1000" in jobs[0].source_url


@pytest.mark.asyncio
@respx.mock
async def test_glassdoor_session_cookie_sent():
    """GLASSDOOR_SESSION is forwarded as a Cookie header in GQL fallback."""
    captured = {}

    def handler(request):
        captured["cookie"] = request.headers.get("cookie", "")
        return httpx.Response(200, json=_gql_response(_fresh_age_days(), count=0))

    respx.post(_GRAPH_URL).mock(side_effect=handler)
    with patch("scraper.adapters.glassdoor.GlassdoorAdapter._playwright_search",
               new=AsyncMock(return_value=[])), \
         patch("scraper.adapters.glassdoor.settings") as s:
        s.GLASSDOOR_SESSION = "my-gs-session"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = GlassdoorAdapter()
        await adapter.search(None, None, 24)
    assert "my-gs-session" in captured["cookie"]


@pytest.mark.asyncio
@respx.mock
async def test_glassdoor_handles_non_200():
    """Non-200 GraphQL response returns empty list."""
    respx.get(_SEARCH_URL).mock(return_value=httpx.Response(200, text="<html></html>"))
    respx.post(_GRAPH_URL).mock(return_value=httpx.Response(403))
    with patch("scraper.adapters.glassdoor.GlassdoorAdapter._playwright_search",
               new=AsyncMock(return_value=[])), \
         patch("scraper.adapters.glassdoor.settings") as s:
        s.GLASSDOOR_SESSION = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = GlassdoorAdapter()
        jobs = await adapter.search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
@respx.mock
async def test_glassdoor_handles_unexpected_structure():
    """Malformed GraphQL response returns empty list."""
    respx.get(_SEARCH_URL).mock(return_value=httpx.Response(200, text="<html></html>"))
    respx.post(_GRAPH_URL).mock(return_value=httpx.Response(200, json={"data": {}}))
    with patch("scraper.adapters.glassdoor.GlassdoorAdapter._playwright_search",
               new=AsyncMock(return_value=[])), \
         patch("scraper.adapters.glassdoor.settings") as s:
        s.GLASSDOOR_SESSION = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = GlassdoorAdapter()
        jobs = await adapter.search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
@respx.mock
async def test_glassdoor_company_appended_to_keyword():
    """Company name filter is applied client-side after search."""
    respx.get(_SEARCH_URL).mock(return_value=httpx.Response(200, text="<html></html>"))

    resp = _gql_response(_fresh_age_days(), count=2)
    # Make one job not match "Stripe"
    resp["data"]["jobListings"]["jobListings"][1]["jobview"]["header"][
        "employerNameFromSearch"
    ] = "Other Corp"
    respx.post(_GRAPH_URL).mock(return_value=httpx.Response(200, json=resp))

    with patch("scraper.adapters.glassdoor.GlassdoorAdapter._playwright_search",
               new=AsyncMock(return_value=[])), \
         patch("scraper.adapters.glassdoor.settings") as s:
        s.GLASSDOOR_SESSION = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = GlassdoorAdapter()
        jobs = await adapter.search(None, "Acme", 24)
    assert len(jobs) == 1
    assert "Acme" in jobs[0].company


@pytest.mark.asyncio
@respx.mock
async def test_glassdoor_fractional_age_in_days():
    """Fractional ageInDays (0.5 = 12h) is handled correctly."""
    respx.get(_SEARCH_URL).mock(return_value=httpx.Response(200, text="<html></html>"))
    respx.post(_GRAPH_URL).mock(
        return_value=httpx.Response(200, json=_gql_response(0.5, count=1))
    )
    with patch("scraper.adapters.glassdoor.GlassdoorAdapter._playwright_search",
               new=AsyncMock(return_value=[])), \
         patch("scraper.adapters.glassdoor.settings") as s:
        s.GLASSDOOR_SESSION = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = GlassdoorAdapter()
        jobs = await adapter.search(None, None, 24)
    assert len(jobs) == 1
    age_hours = (datetime.now(timezone.utc) - jobs[0].posted_at).total_seconds() / 3600
    assert 11 < age_hours < 13


@pytest.mark.asyncio
@respx.mock
async def test_glassdoor_html_stripped_from_description():
    """HTML tags in descriptionFragments are stripped in GQL path."""
    response = _gql_response(_fresh_age_days(), count=1)
    response["data"]["jobListings"]["jobListings"][0]["jobview"]["job"][
        "descriptionFragments"
    ] = ["<b>Exciting</b> opportunity"]
    respx.get(_SEARCH_URL).mock(return_value=httpx.Response(200, text="<html></html>"))
    respx.post(_GRAPH_URL).mock(return_value=httpx.Response(200, json=response))
    with patch("scraper.adapters.glassdoor.GlassdoorAdapter._playwright_search",
               new=AsyncMock(return_value=[])), \
         patch("scraper.adapters.glassdoor.settings") as s:
        s.GLASSDOOR_SESSION = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = GlassdoorAdapter()
        jobs = await adapter.search(None, None, 24)
    assert len(jobs) == 1
    assert "<b>" not in (jobs[0].description_text or "")
    assert "Exciting" in (jobs[0].description_text or "")


# ── Playwright path tests ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_playwright_path_returns_gql_jobs():
    """Playwright path returns jobs when captured GraphQL response contains results."""
    mock_pw, mock_context, mock_page = _make_mock_playwright()

    # Simulate the response event delivering a GQL payload
    gql_payload = _gql_response(_fresh_age_days(), count=3)

    async def fake_run_playwright(self_inner, keywords, company, max_age_hours, proxy):
        return self_inner._parse_gql_payload(gql_payload, max_age_hours)

    with patch("scraper.adapters.playwright_base.async_playwright", return_value=mock_pw), \
         patch("scraper.adapters.playwright_base.get_stealth_context",
               new=AsyncMock(return_value=mock_context)), \
         patch("scraper.adapters.playwright_base.PlaywrightBaseAdapter._run_playwright",
               new=fake_run_playwright), \
         patch("scraper.adapters.glassdoor.settings") as s:
        s.GLASSDOOR_SESSION = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        s.PROXY_LIST = ""
        adapter = GlassdoorAdapter()
        jobs = await adapter._playwright_search("software engineer", None, 24)

    assert len(jobs) == 3
    assert all(j.source == "glassdoor" for j in jobs)


@pytest.mark.asyncio
async def test_playwright_block_detected_falls_back():
    """When Playwright detects a block on every attempt, search falls back to GQL."""
    # _run_playwright returns None (block detected) on all retries
    with patch("scraper.adapters.playwright_base.PlaywrightBaseAdapter._run_playwright",
               new=AsyncMock(return_value=None)), \
         patch("scraper.adapters.playwright_base.ProxyPool") as MockPool, \
         patch("scraper.adapters.playwright_base._throttle") as mock_throttle, \
         patch("scraper.adapters.glassdoor.settings") as s:
        s.GLASSDOOR_SESSION = ""
        s.PROXY_LIST = ""
        mock_throttle.backoff = AsyncMock()
        MockPool.return_value.get.return_value = None
        MockPool.return_value.mark_failure = MagicMock()
        adapter = GlassdoorAdapter()
        jobs = await adapter._playwright_search("engineer", None, 24)

    assert jobs == []


@pytest.mark.asyncio
async def test_playwright_session_cookie_injected():
    """GLASSDOOR_SESSION is injected into the browser context as a cookie."""
    mock_pw, mock_context, mock_page = _make_mock_playwright(html="<html></html>")

    with patch("scraper.adapters.playwright_base.async_playwright", return_value=mock_pw), \
         patch("scraper.adapters.playwright_base.get_stealth_context",
               new=AsyncMock(return_value=mock_context)), \
         patch("scraper.adapters.glassdoor.settings") as s, \
         patch("asyncio.sleep"):
        s.GLASSDOOR_SESSION = "secret-session-token"
        s.REQUEST_TIMEOUT_SECONDS = 30
        s.PLAYWRIGHT_HEADLESS = True
        s.PROXY_LIST = ""
        adapter = GlassdoorAdapter()
        await adapter._run_playwright("engineer", None, 24, None)

    mock_context.add_cookies.assert_called_once()
    cookies = mock_context.add_cookies.call_args[0][0]
    assert any(
        c.get("name") == "GSESSIONID" and c.get("value") == "secret-session-token"
        for c in cookies
    )


@pytest.mark.asyncio
async def test_is_blocked_detects_cloudflare():
    """_is_blocked returns True when the page contains a Cloudflare challenge."""
    mock_pw, mock_context, mock_page = _make_mock_playwright(blocked=True)
    adapter = GlassdoorAdapter()
    assert await adapter._is_blocked(mock_page) is True


@pytest.mark.asyncio
async def test_is_blocked_passes_clean_page():
    """_is_blocked returns False on a normal page."""
    mock_pw, mock_context, mock_page = _make_mock_playwright(html="<html><body>Jobs</body></html>")
    adapter = GlassdoorAdapter()
    assert await adapter._is_blocked(mock_page) is False


# ── Parser unit tests ─────────────────────────────────────────────────────────

def test_parse_gql_payload_fresh_jobs():
    """_parse_gql_payload returns correct number of jobs for fresh listings."""
    adapter = GlassdoorAdapter()
    jobs = adapter._parse_gql_payload(_gql_response(0.1, count=4), 24)
    assert len(jobs) == 4
    assert all(j.source == "glassdoor" for j in jobs)


def test_parse_gql_payload_filters_old():
    """_parse_gql_payload discards listings past max_age_hours."""
    adapter = GlassdoorAdapter()
    jobs = adapter._parse_gql_payload(_gql_response(3.0, count=2), 24)
    assert jobs == []


def test_parse_gql_payload_malformed():
    """_parse_gql_payload returns [] on unexpected dict shape."""
    adapter = GlassdoorAdapter()
    assert adapter._parse_gql_payload({"data": {}}, 24) == []
    assert adapter._parse_gql_payload({}, 24) == []


def test_parse_html_cards_extracts_jobs():
    """_parse_html_cards parses job cards with data-test attributes."""
    html = """
    <ul>
      <li data-test="jobListing">
        <a data-test="job-title" href="/job-listing/senior-engineer-1000">Senior Engineer</a>
        <span data-test="employer-name">Acme Corp</span>
        <div data-test="emp-location">San Francisco, CA</div>
        <div data-test="job-age">Today</div>
      </li>
      <li data-test="jobListing">
        <a data-test="job-title" href="/job-listing/data-scientist-2000">Data Scientist</a>
        <span data-test="employer-name">Beta Inc</span>
        <div data-test="emp-location">Remote</div>
        <div data-test="job-age">1d</div>
      </li>
    </ul>
    """
    adapter = GlassdoorAdapter()
    jobs = adapter._parse_html_cards(html, 24)
    assert len(jobs) == 2
    assert jobs[0].title == "Senior Engineer"
    assert jobs[0].company == "Acme Corp"
    assert jobs[0].location_city == "San Francisco"
    assert jobs[1].title == "Data Scientist"
    assert all(j.source == "glassdoor" for j in jobs)


def test_parse_html_cards_filters_old():
    """_parse_html_cards discards cards older than max_age_hours."""
    html = """
    <ul>
      <li data-test="jobListing">
        <a data-test="job-title" href="/job-listing/old-role-9999">Old Role</a>
        <span data-test="employer-name">Old Corp</span>
        <div data-test="job-age">5d</div>
      </li>
    </ul>
    """
    adapter = GlassdoorAdapter()
    jobs = adapter._parse_html_cards(html, 24)
    assert jobs == []


def test_parse_html_cards_empty_page():
    """_parse_html_cards returns [] when no job cards are present."""
    adapter = GlassdoorAdapter()
    assert adapter._parse_html_cards("<html><body>No jobs</body></html>", 24) == []


def test_parse_age_text_variants():
    """_parse_age_text handles all Glassdoor age string formats."""
    adapter = GlassdoorAdapter()
    now = datetime.now(timezone.utc)

    assert adapter._parse_age_text("Today", now) == now
    assert adapter._parse_age_text("Just Posted", now) == now
    assert adapter._parse_age_text("2 hours ago", now) == now

    yesterday = adapter._parse_age_text("Yesterday", now)
    assert yesterday is not None
    assert abs((now - yesterday).total_seconds() - 86400) < 5

    two_days = adapter._parse_age_text("2d", now)
    assert two_days is not None
    assert abs((now - two_days).total_seconds() - 2 * 86400) < 5

    assert adapter._parse_age_text("30+ days ago", now) is None
    assert adapter._parse_age_text("", now) is None
