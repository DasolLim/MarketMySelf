import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scraper.adapters.careerbuilder import CareerBuilderAdapter

_BASE = "scraper.adapters.playwright_base"


def _fresh_iso() -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")


def _old_iso() -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=48)).strftime("%Y-%m-%dT%H:%M:%SZ")


def _html_with_jobs(postings: list[dict]) -> str:
    scripts = "\n".join(
        f'<script type="application/ld+json">{json.dumps(p)}</script>'
        for p in postings
    )
    return f"<html><head>{scripts}</head><body></body></html>"


def _posting(posted_at: str, idx: int = 0) -> dict:
    return {
        "@type": "JobPosting",
        "title": f"Senior Engineer {idx}",
        "hiringOrganization": {"name": f"Acme Corp {idx}"},
        "jobLocation": {"address": {"addressLocality": "New York", "addressRegion": "NY"}},
        "datePosted": posted_at,
        "url": f"https://careerbuilder.com/job/{idx}",
        "description": "<p>Great role</p>",
        "baseSalary": {
            "value": {"minValue": 120000, "maxValue": 160000}
        },
    }


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


@pytest.mark.asyncio
async def test_careerbuilder_returns_jobs():
    """Fresh JSON-LD postings are parsed and returned."""
    html = _html_with_jobs([_posting(_fresh_iso(), 0), _posting(_fresh_iso(), 1)])
    mock_ap, mock_gsc, _ = _make_pw_mocks(html)
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        jobs = await CareerBuilderAdapter().search(None, None, 24)
    assert len(jobs) == 2
    assert all(j.source == "careerbuilder" for j in jobs)
    assert all(j.experience_level == "senior" for j in jobs)
    assert all(j.source_id != "" for j in jobs)


@pytest.mark.asyncio
async def test_careerbuilder_filters_old_jobs():
    """Postings older than max_age_hours are discarded."""
    html = _html_with_jobs([_posting(_old_iso())])
    mock_ap, mock_gsc, _ = _make_pw_mocks(html)
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        jobs = await CareerBuilderAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
async def test_careerbuilder_no_json_ld_returns_empty():
    """Page with no JSON-LD blocks returns empty list."""
    mock_ap, mock_gsc, _ = _make_pw_mocks("<html><body><p>No jobs here</p></body></html>")
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        jobs = await CareerBuilderAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
async def test_careerbuilder_ignores_non_job_posting_types():
    """JSON-LD blocks that are not @type JobPosting are ignored."""
    html = _html_with_jobs([{"@type": "Organization", "name": "Acme"}])
    mock_ap, mock_gsc, _ = _make_pw_mocks(html)
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        jobs = await CareerBuilderAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
async def test_careerbuilder_handles_non_200():
    """Non-200 response returns empty list gracefully."""
    mock_ap, mock_gsc, _ = _make_pw_mocks("", status=403)
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        jobs = await CareerBuilderAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
async def test_careerbuilder_playwright_error_returns_empty():
    """Playwright exception returns empty list gracefully."""
    mock_ap, mock_gsc, page = _make_pw_mocks("")
    page.goto = AsyncMock(side_effect=Exception("browser crashed"))
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        jobs = await CareerBuilderAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
async def test_careerbuilder_salary_extracted():
    """Salary min/max are extracted from baseSalary.value."""
    html = _html_with_jobs([_posting(_fresh_iso())])
    mock_ap, mock_gsc, _ = _make_pw_mocks(html)
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        jobs = await CareerBuilderAdapter().search(None, None, 24)
    assert len(jobs) == 1
    assert jobs[0].salary_min == 120000
    assert jobs[0].salary_max == 160000


@pytest.mark.asyncio
async def test_careerbuilder_html_stripped_from_description():
    """HTML tags are stripped from job descriptions."""
    posting = _posting(_fresh_iso())
    posting["description"] = "<b>Exciting</b> <i>opportunity</i>"
    html = _html_with_jobs([posting])
    mock_ap, mock_gsc, _ = _make_pw_mocks(html)
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        jobs = await CareerBuilderAdapter().search(None, None, 24)
    assert len(jobs) == 1
    assert "<b>" not in (jobs[0].description_text or "")
    assert "Exciting" in (jobs[0].description_text or "")


@pytest.mark.asyncio
async def test_careerbuilder_keywords_in_url():
    """Keywords are passed as the keywords query param in the URL."""
    mock_ap, mock_gsc, page = _make_pw_mocks("<html></html>")
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        await CareerBuilderAdapter().search("python developer", None, 24)
    call_url: str = page.goto.call_args[0][0]
    assert "keywords=python+developer" in call_url or "keywords=python%20developer" in call_url


@pytest.mark.asyncio
async def test_careerbuilder_company_param_included():
    """Company name is included as company_name in the URL."""
    mock_ap, mock_gsc, page = _make_pw_mocks("<html></html>")
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        await CareerBuilderAdapter().search(None, "Stripe", 24)
    call_url: str = page.goto.call_args[0][0]
    assert "company_name=Stripe" in call_url
