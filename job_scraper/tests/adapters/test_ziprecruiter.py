import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
import respx

from scraper.adapters.ziprecruiter import ZipRecruiterAdapter

_BASE = "scraper.adapters.playwright_base"
_API_URL = "https://api.ziprecruiter.com/jobs/search"


def _fresh_relative() -> str:
    return "2 hours ago"


def _old_relative() -> str:
    return "2 days ago"


def _api_response(posted_time: str, count: int = 2) -> dict:
    return {
        "jobs": [
            {
                "name": f"Senior Engineer {i}",
                "hiring_company": {"name": f"Acme Corp {i}"},
                "job_location": "New York, NY",
                "remote_ok": True,
                "posted_time": posted_time,
                "job_url": f"https://ziprecruiter.com/jobs/{i}",
                "snippet": "<p>Great opportunity</p>",
                "salary_min": 120000,
                "salary_max": 160000,
            }
            for i in range(count)
        ]
    }


def _apollo_html(posted_time: str, count: int = 2) -> str:
    apollo = {}
    for i in range(count):
        apollo[f"Job:{i}"] = {
            "__typename": "Job",
            "name": f"Senior Engineer {i}",
            "hiring_company": {"name": f"Acme Corp {i}"},
            "job_location": "New York, NY",
            "remote_ok": True,
            "posted_time": posted_time,
            "job_url": f"https://ziprecruiter.com/jobs/{i}",
            "snippet": "<p>Great opportunity</p>",
        }
    script = f'<script type="application/json" data-js="job-search-apollo-state">{json.dumps(apollo)}</script>'
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


# ── API path tests ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
@respx.mock
async def test_ziprecruiter_api_returns_jobs():
    """API path returns normalised jobs when key is set."""
    respx.get(_API_URL).mock(return_value=httpx.Response(200, json=_api_response(_fresh_relative())))
    with patch("scraper.adapters.ziprecruiter.settings") as mock_settings:
        mock_settings.ZIPRECRUITER_API_KEY = "test-key"
        mock_settings.REQUEST_TIMEOUT_SECONDS = 30
        jobs = await ZipRecruiterAdapter().search(None, None, 24)
    assert len(jobs) == 2
    assert all(j.source == "ziprecruiter" for j in jobs)
    assert all(j.source_id != "" for j in jobs)
    assert all(j.work_type == "remote" for j in jobs)


@pytest.mark.asyncio
@respx.mock
async def test_ziprecruiter_api_filters_old_jobs():
    """Old jobs from API path are discarded."""
    respx.get(_API_URL).mock(return_value=httpx.Response(200, json=_api_response(_old_relative())))
    with patch("scraper.adapters.ziprecruiter.settings") as mock_settings:
        mock_settings.ZIPRECRUITER_API_KEY = "test-key"
        mock_settings.REQUEST_TIMEOUT_SECONDS = 30
        jobs = await ZipRecruiterAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
@respx.mock
async def test_ziprecruiter_api_handles_non_200():
    """Non-200 from API returns empty list."""
    respx.get(_API_URL).mock(return_value=httpx.Response(403))
    with patch("scraper.adapters.ziprecruiter.settings") as mock_settings:
        mock_settings.ZIPRECRUITER_API_KEY = "test-key"
        mock_settings.REQUEST_TIMEOUT_SECONDS = 30
        jobs = await ZipRecruiterAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
@respx.mock
async def test_ziprecruiter_api_company_filter():
    """Company filter is applied client-side to API results."""
    data = _api_response(_fresh_relative(), count=2)
    data["jobs"][0]["hiring_company"] = {"name": "Stripe"}
    data["jobs"][1]["hiring_company"] = {"name": "Acme Corp"}
    respx.get(_API_URL).mock(return_value=httpx.Response(200, json=data))
    with patch("scraper.adapters.ziprecruiter.settings") as mock_settings:
        mock_settings.ZIPRECRUITER_API_KEY = "test-key"
        mock_settings.REQUEST_TIMEOUT_SECONDS = 30
        jobs = await ZipRecruiterAdapter().search(None, "Stripe", 24)
    assert len(jobs) == 1
    assert jobs[0].company == "Stripe"


# ── Scrape path tests (Playwright) ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ziprecruiter_scrape_returns_jobs():
    """Scrape path parses Apollo state and returns jobs when no API key."""
    html = _apollo_html(_fresh_relative())
    mock_ap, mock_gsc, _ = _make_pw_mocks(html)
    with patch("scraper.adapters.ziprecruiter.settings") as mock_settings, \
         patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        mock_settings.ZIPRECRUITER_API_KEY = ""
        jobs = await ZipRecruiterAdapter().search(None, None, 24)
    assert len(jobs) == 2
    assert all(j.source == "ziprecruiter" for j in jobs)
    assert all(j.source_id != "" for j in jobs)
    assert all(j.work_type == "remote" for j in jobs)


@pytest.mark.asyncio
async def test_ziprecruiter_scrape_filters_old_jobs():
    """Old jobs in Apollo state are discarded."""
    html = _apollo_html(_old_relative())
    mock_ap, mock_gsc, _ = _make_pw_mocks(html)
    with patch("scraper.adapters.ziprecruiter.settings") as mock_settings, \
         patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        mock_settings.ZIPRECRUITER_API_KEY = ""
        jobs = await ZipRecruiterAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
async def test_ziprecruiter_scrape_no_script_tag():
    """Missing Apollo script tag returns empty list."""
    mock_ap, mock_gsc, _ = _make_pw_mocks("<html><body><p>no jobs</p></body></html>")
    with patch("scraper.adapters.ziprecruiter.settings") as mock_settings, \
         patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        mock_settings.ZIPRECRUITER_API_KEY = ""
        jobs = await ZipRecruiterAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
async def test_ziprecruiter_scrape_handles_non_200():
    """Non-200 on scrape path returns empty list."""
    mock_ap, mock_gsc, _ = _make_pw_mocks("", status=503)
    with patch("scraper.adapters.ziprecruiter.settings") as mock_settings, \
         patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        mock_settings.ZIPRECRUITER_API_KEY = ""
        jobs = await ZipRecruiterAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
async def test_ziprecruiter_scrape_playwright_error_returns_empty():
    """Playwright exception on scrape path returns empty list."""
    mock_ap, mock_gsc, page = _make_pw_mocks("")
    page.goto = AsyncMock(side_effect=Exception("connection refused"))
    with patch("scraper.adapters.ziprecruiter.settings") as mock_settings, \
         patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        mock_settings.ZIPRECRUITER_API_KEY = ""
        jobs = await ZipRecruiterAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
async def test_ziprecruiter_scrape_company_filter():
    """Company filter applied client-side to scraped results."""
    apollo = {
        "Job:0": {
            "__typename": "Job",
            "name": "Senior Engineer",
            "hiring_company": {"name": "Stripe"},
            "job_location": "Remote",
            "remote_ok": True,
            "posted_time": _fresh_relative(),
            "job_url": "https://ziprecruiter.com/jobs/0",
            "snippet": "Great role",
        },
        "Job:1": {
            "__typename": "Job",
            "name": "Senior Engineer",
            "hiring_company": {"name": "Other Corp"},
            "job_location": "Remote",
            "remote_ok": True,
            "posted_time": _fresh_relative(),
            "job_url": "https://ziprecruiter.com/jobs/1",
            "snippet": "Great role",
        },
    }
    script = f'<script type="application/json" data-js="job-search-apollo-state">{json.dumps(apollo)}</script>'
    html = f"<html><head>{script}</head><body></body></html>"
    mock_ap, mock_gsc, _ = _make_pw_mocks(html)
    with patch("scraper.adapters.ziprecruiter.settings") as mock_settings, \
         patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        mock_settings.ZIPRECRUITER_API_KEY = ""
        jobs = await ZipRecruiterAdapter().search(None, "Stripe", 24)
    assert len(jobs) == 1
    assert jobs[0].company == "Stripe"
