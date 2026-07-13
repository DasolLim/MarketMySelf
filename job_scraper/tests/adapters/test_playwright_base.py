"""
Tests for PlaywrightBaseAdapter — the shared anti-detection engine.

A concrete subclass (_TestAdapter) is used to exercise the base class
without depending on any real job board.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scraper.adapters.playwright_base import PlaywrightBaseAdapter
from scraper.models import ScrapedJob

_BASE = "scraper.adapters.playwright_base"


# ── concrete subclass for testing ─────────────────────────────────────────────

class _TestAdapter(PlaywrightBaseAdapter):
    source = "test_board"
    domain = "test.example.com"
    rate_limit_seconds = 0
    max_retries = 2

    def __init__(self, parse_result=None):
        self._parse_result = parse_result or []

    def _build_search_url(self, keywords, company, max_age_hours):
        q = keywords or ""
        if company:
            q += f" {company}"
        return f"https://test.example.com/jobs?q={q}"

    def _parse_page(self, html, captured, max_age_hours):
        return list(self._parse_result)

    async def search(self, keywords=None, company=None, max_age_hours=24):
        return await self._playwright_search(keywords, company, max_age_hours)


def _make_pw_mocks(html="<html></html>", status=200, blocked=False):
    """Return (mock_ap, mock_gsc, page, context) with sensible defaults."""
    page_content = "just a moment cloudflare" if blocked else html

    page = AsyncMock()
    page.goto = AsyncMock(return_value=MagicMock(status=status))
    page.content = AsyncMock(return_value=page_content)
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

    return mock_ap, mock_gsc, page, context


# ── _is_blocked ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_is_blocked_detects_cloudflare():
    page = AsyncMock()
    page.content = AsyncMock(return_value="just a moment cloudflare challenge")
    assert await _TestAdapter()._is_blocked(page) is True


@pytest.mark.asyncio
async def test_is_blocked_detects_captcha():
    page = AsyncMock()
    page.content = AsyncMock(return_value="<html>please complete this captcha</html>")
    assert await _TestAdapter()._is_blocked(page) is True


@pytest.mark.asyncio
async def test_is_blocked_passes_clean_page():
    page = AsyncMock()
    page.content = AsyncMock(return_value="<html><body>Jobs here</body></html>")
    assert await _TestAdapter()._is_blocked(page) is False


@pytest.mark.asyncio
async def test_is_blocked_swallows_exception():
    page = AsyncMock()
    page.content = AsyncMock(side_effect=Exception("context destroyed"))
    assert await _TestAdapter()._is_blocked(page) is False


# ── _simulate_human ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_simulate_human_calls_mouse_and_scroll():
    page = AsyncMock()
    with patch("asyncio.sleep"):
        await _TestAdapter()._simulate_human(page)
    page.mouse.move.assert_called()
    page.evaluate.assert_called_once()
    call_arg = page.evaluate.call_args[0][0]
    assert "scrollBy" in call_arg


# ── _run_playwright — normal flow ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_run_playwright_returns_jobs():
    """Normal flow: search page loads, _parse_page returns results."""
    from datetime import datetime, timezone
    job = MagicMock(spec=ScrapedJob)
    adapter = _TestAdapter(parse_result=[job])

    mock_ap, mock_gsc, page, _ = _make_pw_mocks("<html>jobs</html>")
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        result = await adapter._run_playwright("python", None, 24, None)

    assert result == [job]


@pytest.mark.asyncio
async def test_run_playwright_returns_none_on_block():
    """Bot block on search page → _run_playwright returns None."""
    adapter = _TestAdapter()
    mock_ap, mock_gsc, page, _ = _make_pw_mocks(blocked=True)

    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        result = await adapter._run_playwright("python", None, 24, None)

    assert result is None


@pytest.mark.asyncio
async def test_run_playwright_returns_empty_on_non_200():
    """Non-200 search page status → _run_playwright returns []."""
    adapter = _TestAdapter()
    mock_ap, mock_gsc, page, _ = _make_pw_mocks(status=403)

    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        result = await adapter._run_playwright("python", None, 24, None)

    assert result == []


# ── _run_playwright — home_url natural path ───────────────────────────────────

@pytest.mark.asyncio
async def test_home_url_visited_before_search():
    """When home_url is set, goto is called twice (home then search)."""
    class _HomeAdapter(_TestAdapter):
        home_url = "https://test.example.com"

    mock_ap, mock_gsc, page, _ = _make_pw_mocks("<html>clean</html>")
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        await _HomeAdapter()._run_playwright("python", None, 24, None)

    assert page.goto.call_count == 2
    first_url = page.goto.call_args_list[0][0][0]
    assert first_url == "https://test.example.com"


@pytest.mark.asyncio
async def test_home_url_block_returns_none():
    """Bot block on the homepage → _run_playwright returns None immediately."""
    class _HomeAdapter(_TestAdapter):
        home_url = "https://test.example.com"

    mock_ap, mock_gsc, page, _ = _make_pw_mocks(blocked=True)
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        result = await _HomeAdapter()._run_playwright("python", None, 24, None)

    assert result is None
    # Should not proceed to the search URL after detecting a block
    assert page.goto.call_count == 1


# ── _run_playwright — session cookies ────────────────────────────────────────

@pytest.mark.asyncio
async def test_session_cookies_injected():
    """Cookies returned by _session_cookies are injected before navigation."""
    class _AuthAdapter(_TestAdapter):
        def _session_cookies(self):
            return [{"name": "token", "value": "secret", "domain": ".example.com", "path": "/"}]

    mock_ap, mock_gsc, page, context = _make_pw_mocks()
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        await _AuthAdapter()._run_playwright("python", None, 24, None)

    context.add_cookies.assert_called_once()
    injected = context.add_cookies.call_args[0][0]
    assert injected[0]["name"] == "token"
    assert injected[0]["value"] == "secret"


@pytest.mark.asyncio
async def test_no_cookies_when_session_cookies_empty():
    """add_cookies is not called when _session_cookies returns []."""
    mock_ap, mock_gsc, page, context = _make_pw_mocks()
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        await _TestAdapter()._run_playwright("python", None, 24, None)

    context.add_cookies.assert_not_called()


# ── _run_playwright — wait_selector ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_wait_selector_called_when_set():
    """wait_for_selector is called with the configured selector."""
    class _WaitAdapter(_TestAdapter):
        wait_selector = "script[data-id='jobs']"

    mock_ap, mock_gsc, page, _ = _make_pw_mocks()
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        await _WaitAdapter()._run_playwright("python", None, 24, None)

    page.wait_for_selector.assert_called_once_with("script[data-id='jobs']", timeout=8_000)


@pytest.mark.asyncio
async def test_wait_selector_timeout_is_ignored():
    """A timeout in wait_for_selector does not abort the session."""
    class _WaitAdapter(_TestAdapter):
        wait_selector = "script[data-id='jobs']"

    mock_ap, mock_gsc, page, _ = _make_pw_mocks()
    page.wait_for_selector = AsyncMock(side_effect=Exception("timeout"))
    with patch(f"{_BASE}.async_playwright", mock_ap), \
         patch(f"{_BASE}.get_stealth_context", mock_gsc), \
         patch("asyncio.sleep"):
        result = await _WaitAdapter()._run_playwright("python", None, 24, None)

    assert result == []  # parse_result is empty but no exception raised


# ── _playwright_search — retry loop ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_playwright_search_retries_on_block():
    """_playwright_search exhausts max_retries when _run_playwright returns None."""
    call_count = 0

    async def fake_run(self, keywords, company, max_age_hours, proxy):
        nonlocal call_count
        call_count += 1
        return None  # always blocked

    with patch.object(_TestAdapter, "_run_playwright", new=fake_run), \
         patch(f"{_BASE}._throttle") as mock_throttle:
        mock_throttle.backoff = AsyncMock()
        mock_throttle.wait = AsyncMock()
        result = await _TestAdapter()._playwright_search("python", None, 24)

    assert result == []
    assert call_count == _TestAdapter.max_retries


@pytest.mark.asyncio
async def test_playwright_search_returns_on_first_success():
    """_playwright_search stops at the first successful attempt."""
    from datetime import datetime, timezone
    job = MagicMock(spec=ScrapedJob)
    attempt_count = 0

    async def fake_run(self, keywords, company, max_age_hours, proxy):
        nonlocal attempt_count
        attempt_count += 1
        return [job]

    with patch.object(_TestAdapter, "_run_playwright", new=fake_run), \
         patch(f"{_BASE}._throttle") as mock_throttle:
        mock_throttle.backoff = AsyncMock()
        mock_throttle.wait = AsyncMock()
        result = await _TestAdapter()._playwright_search("python", None, 24)

    assert result == [job]
    assert attempt_count == 1


@pytest.mark.asyncio
async def test_playwright_search_recovers_after_exception():
    """An exception on attempt 1 is caught and attempt 2 succeeds."""
    from datetime import datetime, timezone
    job = MagicMock(spec=ScrapedJob)
    call_n = 0

    async def fake_run(self, keywords, company, max_age_hours, proxy):
        nonlocal call_n
        call_n += 1
        if call_n == 1:
            raise RuntimeError("browser crashed")
        return [job]

    with patch.object(_TestAdapter, "_run_playwright", new=fake_run), \
         patch(f"{_BASE}._throttle") as mock_throttle:
        mock_throttle.backoff = AsyncMock()
        mock_throttle.wait = AsyncMock()
        result = await _TestAdapter()._playwright_search("python", None, 24)

    assert result == [job]
