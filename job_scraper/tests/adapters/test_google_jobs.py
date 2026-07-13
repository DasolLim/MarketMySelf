import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scraper.adapters.google_jobs import GoogleJobsAdapter

_BASE = "scraper.adapters.playwright_base"


def _fresh_iso() -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")


def _old_iso() -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=48)).strftime("%Y-%m-%dT%H:%M:%SZ")


def _serpapi_results(posted_at: str, count: int = 2) -> dict:
    return {
        "jobs_results": [
            {
                "title": f"Senior Engineer {i}",
                "company_name": f"Acme Corp {i}",
                "location": "New York, NY",
                "detected_extensions": {"posted_at": posted_at},
                "share_link": f"https://google.com/jobs/{i}",
                "job_highlights": [{"items": ["Python", "Remote OK"]}],
            }
            for i in range(count)
        ]
    }


def _json_ld_html(date_posted: str, count: int = 2) -> str:
    scripts = "\n".join(
        f'<script type="application/ld+json">{json.dumps({"@type": "JobPosting", "title": f"Senior Engineer {i}", "hiringOrganization": {"name": f"Acme Corp {i}"}, "jobLocation": {"address": {"addressLocality": "New York", "addressRegion": "NY"}}, "datePosted": date_posted, "url": f"https://google.com/jobs/{i}", "description": "<p>Great role</p>"})}</script>'
        for i in range(count)
    )
    return f"<html><head>{scripts}</head><body></body></html>"


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


# ── SerpAPI path ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_google_jobs_serpapi_returns_jobs():
    """SerpAPI path returns normalised jobs."""
    with patch("scraper.adapters.google_jobs.settings") as s, \
         patch("scraper.adapters.google_jobs.GoogleJobsAdapter._search_serpapi") as mock_serpapi:
        s.SERPAPI_KEY = "test-key"
        s.REQUEST_TIMEOUT_SECONDS = 30
        mock_serpapi.return_value = [MagicMock(source="google_jobs", category=None)]
        adapter = GoogleJobsAdapter()
        jobs = await adapter.search(None, None, 24)
    assert len(jobs) == 1


@pytest.mark.asyncio
async def test_google_jobs_serpapi_fresh_jobs():
    """SerpAPI path: fresh relative timestamps pass the age filter."""
    with patch("scraper.adapters.google_jobs.settings") as s:
        s.SERPAPI_KEY = "test-key"
        s.REQUEST_TIMEOUT_SECONDS = 30

        with patch.dict("sys.modules", {"serpapi": MagicMock()}):
            import sys
            mock_gs = MagicMock()
            mock_gs.get_dict.return_value = _serpapi_results("2 hours ago")
            sys.modules["serpapi"].GoogleSearch = MagicMock(return_value=mock_gs)

            adapter = GoogleJobsAdapter()
            jobs = await adapter.search(None, None, 24)

    assert len(jobs) == 2
    assert all(j.source == "google_jobs" for j in jobs)
    assert all(j.source_id != "" for j in jobs)


@pytest.mark.asyncio
async def test_google_jobs_serpapi_filters_old_jobs():
    """SerpAPI path: old relative timestamps are discarded."""
    with patch("scraper.adapters.google_jobs.settings") as s:
        s.SERPAPI_KEY = "test-key"
        s.REQUEST_TIMEOUT_SECONDS = 30

        with patch.dict("sys.modules", {"serpapi": MagicMock()}):
            import sys
            mock_gs = MagicMock()
            mock_gs.get_dict.return_value = _serpapi_results("2 days ago")
            sys.modules["serpapi"].GoogleSearch = MagicMock(return_value=mock_gs)

            adapter = GoogleJobsAdapter()
            jobs = await adapter.search(None, None, 24)

    assert jobs == []


@pytest.mark.asyncio
async def test_google_jobs_serpapi_includes_company_in_query():
    """Company name is included in the SerpAPI query string."""
    captured = {}

    with patch("scraper.adapters.google_jobs.settings") as s:
        s.SERPAPI_KEY = "test-key"
        s.REQUEST_TIMEOUT_SECONDS = 30

        with patch.dict("sys.modules", {"serpapi": MagicMock()}):
            import sys

            def capture_params(params):
                captured["q"] = params.get("q", "")
                m = MagicMock()
                m.get_dict.return_value = {"jobs_results": []}
                return m

            sys.modules["serpapi"].GoogleSearch = MagicMock(side_effect=capture_params)

            adapter = GoogleJobsAdapter()
            await adapter.search(None, "Stripe", 24)

    assert "Stripe" in captured["q"]


# ── Playwright fallback path ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_google_jobs_playwright_returns_jobs():
    """Playwright fallback parses JSON-LD and returns jobs."""
    html = _json_ld_html(_fresh_iso(), count=2)
    mock_ap, mock_gsc, _ = _make_pw_mocks(html)

    with patch("scraper.adapters.google_jobs.settings") as s, \
         patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        s.SERPAPI_KEY = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        jobs = await GoogleJobsAdapter().search(None, None, 24)

    assert len(jobs) == 2
    assert all(j.source == "google_jobs" for j in jobs)
    assert all(j.source_id != "" for j in jobs)


@pytest.mark.asyncio
async def test_google_jobs_playwright_filters_old_jobs():
    """Playwright fallback: old datePosted values are discarded."""
    html = _json_ld_html(_old_iso(), count=2)
    mock_ap, mock_gsc, _ = _make_pw_mocks(html)

    with patch("scraper.adapters.google_jobs.settings") as s, \
         patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        s.SERPAPI_KEY = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        jobs = await GoogleJobsAdapter().search(None, None, 24)

    assert jobs == []


@pytest.mark.asyncio
async def test_google_jobs_playwright_error_returns_empty():
    """Playwright errors are caught and return empty list."""
    mock_ap, mock_gsc, page = _make_pw_mocks("")
    page.goto = AsyncMock(side_effect=Exception("browser crash"))

    with patch("scraper.adapters.google_jobs.settings") as s, \
         patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        s.SERPAPI_KEY = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        jobs = await GoogleJobsAdapter().search(None, None, 24)

    assert jobs == []


@pytest.mark.asyncio
async def test_google_jobs_playwright_no_json_ld_returns_empty():
    """No JSON-LD blocks on page returns empty list."""
    mock_ap, mock_gsc, _ = _make_pw_mocks("<html><body><p>nothing here</p></body></html>")

    with patch("scraper.adapters.google_jobs.settings") as s, \
         patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        s.SERPAPI_KEY = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        jobs = await GoogleJobsAdapter().search(None, None, 24)

    assert jobs == []
