"""
Indeed adapter tests.

Indeed now uses the Playwright path. Tests exercise _parse_page directly for
parser logic and mock async_playwright + get_stealth_context for integration tests.
"""
import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scraper.adapters.indeed import IndeedAdapter

_BASE = "scraper.adapters.playwright_base"


# ── HTML fixtures ─────────────────────────────────────────────────────────────

def _fresh_pub_date() -> int:
    return int((datetime.now(timezone.utc) - timedelta(hours=2)).timestamp() * 1000)


def _old_pub_date() -> int:
    return int((datetime.now(timezone.utc) - timedelta(hours=48)).timestamp() * 1000)


def _mosaic_html(pub_date: int, count: int = 2, captcha: bool = False) -> str:
    if captcha:
        return "<html><body><p>Please complete this CAPTCHA</p></body></html>"
    results = [
        {
            "jobkey": f"abc{i}",
            "displayTitle": f"Senior Engineer {i}",
            "company": f"Acme Corp {i}",
            "jobLocationCity": "New York",
            "jobLocationState": "NY",
            "pubDate": pub_date,
            "snippet": "<p>Great role</p>",
            "remoteWorkModel": {"text": "Remote"},
        }
        for i in range(count)
    ]
    mosaic_data = {
        "mosaic": {
            "mosaic-provider-jobcards": {
                "data": {"results": results}
            }
        }
    }
    script = f'<script id="mosaic-data">window.mosaic.providerData={json.dumps(mosaic_data)}</script>'
    return f"<html><head>{script}</head><body></body></html>"


def _make_pw_mocks(html: str, status: int = 200):
    page = AsyncMock()
    page.goto = AsyncMock(return_value=MagicMock(status=status))
    page.content = AsyncMock(return_value=html)
    page.wait_for_selector = AsyncMock()
    page.mouse = AsyncMock()
    page.evaluate = AsyncMock()
    page.on = MagicMock()

    context = AsyncMock()
    context.pages = [page]
    context.add_cookies = AsyncMock()
    context.close = AsyncMock()

    pw_cm = AsyncMock()
    pw_cm.__aenter__ = AsyncMock(return_value=MagicMock())
    pw_cm.__aexit__ = AsyncMock(return_value=False)

    mock_ap = MagicMock(return_value=pw_cm)
    mock_gsc = AsyncMock(return_value=context)

    return mock_ap, mock_gsc, page


# ── Parser unit tests (_parse_page directly) ──────────────────────────────────

def test_indeed_parse_fresh_jobs():
    """Fresh mosaic-data jobs are parsed and returned."""
    html = _mosaic_html(_fresh_pub_date())
    adapter = IndeedAdapter()
    jobs = adapter._parse_page(html, [], 24)
    assert len(jobs) == 2
    assert all(j.source == "indeed" for j in jobs)
    assert all(j.experience_level == "senior" for j in jobs)
    assert all(j.source_id != "" for j in jobs)
    assert all(j.work_type == "remote" for j in jobs)


def test_indeed_parse_filters_old_jobs():
    """Jobs with pubDate older than max_age_hours are discarded."""
    html = _mosaic_html(_old_pub_date())
    adapter = IndeedAdapter()
    jobs = adapter._parse_page(html, [], 24)
    assert jobs == []


def test_indeed_parse_source_url_built_from_jobkey():
    """source_url is constructed from jobkey."""
    html = _mosaic_html(_fresh_pub_date(), count=1)
    adapter = IndeedAdapter()
    jobs = adapter._parse_page(html, [], 24)
    assert len(jobs) == 1
    assert jobs[0].source_url == "https://www.indeed.com/viewjob?jk=abc0"
    assert jobs[0].source_id == "abc0"


def test_indeed_parse_captcha_returns_empty():
    """CAPTCHA page returns empty list with no exception."""
    html = _mosaic_html(0, captcha=True)
    adapter = IndeedAdapter()
    jobs = adapter._parse_page(html, [], 24)
    assert jobs == []


def test_indeed_parse_no_mosaic_script_returns_empty():
    """Page without mosaic-data script returns empty list."""
    adapter = IndeedAdapter()
    jobs = adapter._parse_page("<html><body><p>no data</p></body></html>", [], 24)
    assert jobs == []


def test_indeed_parse_pub_date_milliseconds_converted():
    """pubDate in milliseconds is divided by 1000 before timestamp parsing."""
    pub_ms = _fresh_pub_date()
    html = _mosaic_html(pub_ms, count=1)
    adapter = IndeedAdapter()
    jobs = adapter._parse_page(html, [], 24)
    assert len(jobs) == 1
    expected_ts = pub_ms // 1000
    assert abs(jobs[0].posted_at.timestamp() - expected_ts) < 2


def test_indeed_parse_html_stripped_from_description():
    """HTML in snippet is stripped."""
    import re
    html = _mosaic_html(_fresh_pub_date(), count=1)
    html = re.sub(
        r'"snippet":\s*"<p>Great role</p>"',
        '"snippet": "<b>Bold</b> role"',
        html,
    )
    adapter = IndeedAdapter()
    jobs = adapter._parse_page(html, [], 24)
    assert len(jobs) == 1
    assert "<b>" not in (jobs[0].description_text or "")
    assert "Bold" in (jobs[0].description_text or "")


# ── Integration tests (Playwright path) ──────────────────────────────────────

@pytest.mark.asyncio
async def test_indeed_search_returns_jobs():
    """Full search() through Playwright returns parsed jobs."""
    html = _mosaic_html(_fresh_pub_date())
    mock_ap, mock_gsc, _ = _make_pw_mocks(html)
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        jobs = await IndeedAdapter().search(None, None, 24)
    assert len(jobs) == 2
    assert all(j.source == "indeed" for j in jobs)


@pytest.mark.asyncio
async def test_indeed_search_handles_non_200():
    """Non-200 response returns empty list."""
    mock_ap, mock_gsc, _ = _make_pw_mocks("", status=403)
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        jobs = await IndeedAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
async def test_indeed_search_playwright_error_returns_empty():
    """Playwright crash returns empty list gracefully."""
    mock_ap, mock_gsc, page = _make_pw_mocks("")
    page.goto = AsyncMock(side_effect=Exception("browser crash"))
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        jobs = await IndeedAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
async def test_indeed_home_url_visited_first():
    """Indeed visits the homepage before the search URL (natural browsing path)."""
    mock_ap, mock_gsc, page = _make_pw_mocks(_mosaic_html(_fresh_pub_date()))
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        await IndeedAdapter().search("python", None, 24)
    # Two goto calls: homepage then search URL
    assert page.goto.call_count == 2
    first_url: str = page.goto.call_args_list[0][0][0]
    assert "indeed.com" in first_url
    assert "jobs" not in first_url  # homepage, not search page


@pytest.mark.asyncio
async def test_indeed_company_in_search_url():
    """Company name is quoted and embedded in the search URL."""
    mock_ap, mock_gsc, page = _make_pw_mocks("<html></html>")
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        await IndeedAdapter().search(None, "Stripe", 24)
    # Second goto call is the search URL
    search_url: str = page.goto.call_args_list[1][0][0]
    assert "Stripe" in search_url
