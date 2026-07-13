"""
Dice adapter tests.

Dice now uses the Playwright path. Tests exercise _parse_page and
_extract_job_list directly for parser logic, and mock the browser for
integration tests.
"""
import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scraper.adapters.dice import DiceAdapter

_BASE = "scraper.adapters.playwright_base"


# ── HTML fixtures ─────────────────────────────────────────────────────────────

def _fresh_iso() -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")


def _old_iso() -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=48)).strftime("%Y-%m-%dT%H:%M:%SZ")


def _make_item(posted_at: str, idx: int = 0) -> dict:
    return {
        "id": f"dice-{idx}",
        "guid": f"guid-{idx}",
        "title": f"Senior Engineer {idx}",
        "companyName": f"Acme Corp {idx}",
        "jobLocation": {"displayName": "New York, NY"},
        "workplaceTypes": ["Remote"],
        "postedDate": posted_at,
        "detailsPageUrl": f"https://dice.com/job/{idx}",
        "summary": "<p>Great role</p>",
    }


def _make_rsc_html(items: list[dict]) -> str:
    payload = {"jobList": {"data": items, "count": len(items)}}
    inner_json = json.dumps(payload)
    escaped = json.dumps(inner_json)[1:-1].replace(r'\"', r'"')
    return f'<html><body><script>self.__next_f.push([1,"{escaped}"])</script></body></html>'


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


# ── Parser unit tests (_parse_page / _extract_job_list directly) ──────────────

def test_dice_parse_fresh_jobs():
    """Fresh jobs are returned and normalised correctly."""
    html = _make_rsc_html([_make_item(_fresh_iso(), 0), _make_item(_fresh_iso(), 1)])
    adapter = DiceAdapter()
    jobs = adapter._parse_page(html, [], 24)
    assert len(jobs) == 2
    assert all(j.source == "dice" for j in jobs)
    assert all(j.experience_level == "senior" for j in jobs)
    assert all(j.source_id != "" for j in jobs)
    assert all(j.work_type == "remote" for j in jobs)


def test_dice_parse_filters_old_jobs():
    """Jobs posted beyond max_age_hours are discarded."""
    html = _make_rsc_html([_make_item(_old_iso())])
    adapter = DiceAdapter()
    jobs = adapter._parse_page(html, [], 24)
    assert jobs == []


def test_dice_parse_empty_page():
    """Page with no RSC push chunks returns empty list without error."""
    adapter = DiceAdapter()
    jobs = adapter._parse_page("<html><body><p>no jobs</p></body></html>", [], 24)
    assert jobs == []


def test_dice_parse_html_stripped_from_description():
    """HTML tags are stripped from job descriptions."""
    item = _make_item(_fresh_iso())
    item["summary"] = "<b>Great</b> <i>role</i>"
    html = _make_rsc_html([item])
    adapter = DiceAdapter()
    jobs = adapter._parse_page(html, [], 24)
    assert len(jobs) == 1
    assert "<b>" not in (jobs[0].description_text or "")
    assert "Great" in (jobs[0].description_text or "")


def test_dice_extract_job_list_returns_items():
    """_extract_job_list extracts the jobList.data array from RSC chunks."""
    items = [_make_item(_fresh_iso(), 0), _make_item(_fresh_iso(), 1)]
    html = _make_rsc_html(items)
    extracted = DiceAdapter()._extract_job_list(html)
    assert len(extracted) == 2
    assert extracted[0]["id"] == "dice-0"


def test_dice_extract_job_list_missing_marker():
    """_extract_job_list returns [] when there are no RSC push chunks."""
    extracted = DiceAdapter()._extract_job_list("<html><body></body></html>")
    assert extracted == []


# ── Integration tests (Playwright path) ──────────────────────────────────────

@pytest.mark.asyncio
async def test_dice_search_returns_jobs():
    """Full search() through Playwright returns parsed jobs."""
    html = _make_rsc_html([_make_item(_fresh_iso(), 0), _make_item(_fresh_iso(), 1)])
    mock_ap, mock_gsc, _ = _make_pw_mocks(html)
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        jobs = await DiceAdapter().search(None, None, 24)
    assert len(jobs) == 2
    assert all(j.source == "dice" for j in jobs)


@pytest.mark.asyncio
async def test_dice_search_handles_non_200():
    """Non-200 response returns empty list."""
    mock_ap, mock_gsc, _ = _make_pw_mocks("", status=429)
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        jobs = await DiceAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
async def test_dice_search_playwright_error_returns_empty():
    """Playwright crash returns empty list gracefully."""
    mock_ap, mock_gsc, page = _make_pw_mocks("")
    page.goto = AsyncMock(side_effect=Exception("browser crash"))
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        jobs = await DiceAdapter().search(None, None, 24)
    assert jobs == []


@pytest.mark.asyncio
async def test_dice_keywords_in_search_url():
    """Keywords are passed as the q parameter in the search URL."""
    mock_ap, mock_gsc, page = _make_pw_mocks("<html></html>")
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        await DiceAdapter().search("python developer", None, 24)
    call_url: str = page.goto.call_args[0][0]
    assert "python" in call_url.lower()


@pytest.mark.asyncio
async def test_dice_company_in_search_url():
    """Company name is appended to the search query in the URL."""
    mock_ap, mock_gsc, page = _make_pw_mocks("<html></html>")
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        await DiceAdapter().search(None, "Stripe", 24)
    call_url: str = page.goto.call_args[0][0]
    assert "Stripe" in call_url
