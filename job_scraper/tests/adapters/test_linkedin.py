from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scraper.adapters.linkedin import LinkedInAdapter


def _fresh_iso() -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")


def _old_iso() -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=48)).strftime("%Y-%m-%dT%H:%M:%SZ")


def _linkedin_html(posted_at: str, count: int = 2, remote: bool = False) -> str:
    location = "Remote" if remote else "New York, NY"
    cards = "\n".join(
        f"""
        <li>
          <div class="job-search-card">
            <h3 class="job-search-card__title">
              <a class="job-search-card__title-link" href="https://linkedin.com/jobs/view/{i}">
                Senior Engineer {i}
              </a>
            </h3>
            <h4 class="job-search-card__subtitle">Acme Corp {i}</h4>
            <span class="job-search-card__location">{location}</span>
            <time datetime="{posted_at}">2 hours ago</time>
          </div>
        </li>
        """
        for i in range(count)
    )
    return f"<html><body><ul>{cards}</ul></body></html>"


def _make_mock_playwright(html: str, login_redirect: bool = False, status: int = 200):
    """Build a fully mocked async_playwright context manager."""
    mock_response = MagicMock()
    mock_response.url = "https://www.linkedin.com/login" if login_redirect else "https://www.linkedin.com/jobs/search/"
    mock_response.status = status

    mock_page = AsyncMock()
    mock_page.goto = AsyncMock(return_value=mock_response)
    mock_page.evaluate = AsyncMock()
    mock_page.query_selector_all = AsyncMock(return_value=[])
    mock_page.content = AsyncMock(return_value=html)

    mock_context = AsyncMock()
    mock_context.pages = [mock_page]
    mock_context.add_cookies = AsyncMock()
    mock_context.close = AsyncMock()

    mock_pw = AsyncMock()
    mock_pw.__aenter__ = AsyncMock(return_value=mock_pw)
    mock_pw.__aexit__ = AsyncMock(return_value=False)

    return mock_pw, mock_context, mock_page


@pytest.mark.asyncio
async def test_linkedin_returns_jobs():
    """Fresh job cards are parsed and returned."""
    html = _linkedin_html(_fresh_iso())
    mock_pw, mock_context, _ = _make_mock_playwright(html)

    with patch("scraper.adapters.linkedin.settings") as s, \
         patch("scraper.adapters.linkedin.async_playwright", return_value=mock_pw), \
         patch("scraper.adapters.linkedin.get_stealth_context", new=AsyncMock(return_value=mock_context)):
        s.LINKEDIN_LI_AT = "test-li-at"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = LinkedInAdapter()
        jobs = await adapter.search(None, None, 24)

    assert len(jobs) == 2
    assert all(j.source == "linkedin" for j in jobs)
    assert all(j.experience_level == "senior" for j in jobs)
    assert all(j.source_id != "" for j in jobs)


@pytest.mark.asyncio
async def test_linkedin_filters_old_jobs():
    """Cards with old datetime attributes are discarded."""
    html = _linkedin_html(_old_iso())
    mock_pw, mock_context, _ = _make_mock_playwright(html)

    with patch("scraper.adapters.linkedin.settings") as s, \
         patch("scraper.adapters.linkedin.async_playwright", return_value=mock_pw), \
         patch("scraper.adapters.linkedin.get_stealth_context", new=AsyncMock(return_value=mock_context)):
        s.LINKEDIN_LI_AT = "test-li-at"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = LinkedInAdapter()
        jobs = await adapter.search(None, None, 24)

    assert jobs == []


@pytest.mark.asyncio
async def test_linkedin_no_token_returns_empty():
    """Returns empty list immediately when LINKEDIN_LI_AT is not set."""
    with patch("scraper.adapters.linkedin.settings") as s:
        s.LINKEDIN_LI_AT = ""
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = LinkedInAdapter()
        jobs = await adapter.search(None, None, 24)

    assert jobs == []


@pytest.mark.asyncio
async def test_linkedin_login_redirect_returns_empty():
    """Redirect to /login (expired session) returns empty list."""
    mock_pw, mock_context, _ = _make_mock_playwright("", login_redirect=True)

    with patch("scraper.adapters.linkedin.settings") as s, \
         patch("scraper.adapters.linkedin.async_playwright", return_value=mock_pw), \
         patch("scraper.adapters.linkedin.get_stealth_context", new=AsyncMock(return_value=mock_context)):
        s.LINKEDIN_LI_AT = "test-li-at"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = LinkedInAdapter()
        jobs = await adapter.search(None, None, 24)

    assert jobs == []


@pytest.mark.asyncio
async def test_linkedin_429_returns_empty():
    """429 response returns empty list gracefully."""
    mock_pw, mock_context, _ = _make_mock_playwright("", status=429)

    with patch("scraper.adapters.linkedin.settings") as s, \
         patch("scraper.adapters.linkedin.async_playwright", return_value=mock_pw), \
         patch("scraper.adapters.linkedin.get_stealth_context", new=AsyncMock(return_value=mock_context)):
        s.LINKEDIN_LI_AT = "test-li-at"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = LinkedInAdapter()
        jobs = await adapter.search(None, None, 24)

    assert jobs == []


@pytest.mark.asyncio
async def test_linkedin_playwright_crash_returns_empty():
    """Playwright exceptions are caught and return empty list."""
    with patch("scraper.adapters.linkedin.settings") as s, \
         patch("scraper.adapters.linkedin.async_playwright", side_effect=Exception("browser crash")):
        s.LINKEDIN_LI_AT = "test-li-at"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = LinkedInAdapter()
        jobs = await adapter.search(None, None, 24)

    assert jobs == []


@pytest.mark.asyncio
async def test_linkedin_company_filter_client_side():
    """Client-side company filter keeps only matching jobs."""
    html = _linkedin_html(_fresh_iso(), count=2)
    html = html.replace("Acme Corp 1", "Other Corp 1")
    mock_pw, mock_context, _ = _make_mock_playwright(html)

    with patch("scraper.adapters.linkedin.settings") as s, \
         patch("scraper.adapters.linkedin.async_playwright", return_value=mock_pw), \
         patch("scraper.adapters.linkedin.get_stealth_context", new=AsyncMock(return_value=mock_context)):
        s.LINKEDIN_LI_AT = "test-li-at"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = LinkedInAdapter()
        jobs = await adapter.search(None, "Acme", 24)

    assert len(jobs) == 1
    assert "Acme" in jobs[0].company


@pytest.mark.asyncio
async def test_linkedin_li_at_cookie_injected():
    """li_at cookie is injected into the browser context."""
    html = _linkedin_html(_fresh_iso(), count=0)
    mock_pw, mock_context, _ = _make_mock_playwright(html)

    with patch("scraper.adapters.linkedin.settings") as s, \
         patch("scraper.adapters.linkedin.async_playwright", return_value=mock_pw), \
         patch("scraper.adapters.linkedin.get_stealth_context", new=AsyncMock(return_value=mock_context)):
        s.LINKEDIN_LI_AT = "my-secret-token"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = LinkedInAdapter()
        await adapter.search(None, None, 24)

    mock_context.add_cookies.assert_called_once()
    cookie_args = mock_context.add_cookies.call_args[0][0]
    assert any(c.get("name") == "li_at" and c.get("value") == "my-secret-token"
               for c in cookie_args)


@pytest.mark.asyncio
async def test_linkedin_no_f_e_param_in_url():
    """f_E (experience level) parameter is no longer included in URL."""
    captured = {}
    html = _linkedin_html(_fresh_iso(), count=0)
    mock_pw, mock_context, mock_page = _make_mock_playwright(html)

    original_goto = mock_page.goto

    async def capture_goto(url, **kwargs):
        captured["url"] = url
        return await original_goto(url, **kwargs)

    mock_page.goto = capture_goto

    with patch("scraper.adapters.linkedin.settings") as s, \
         patch("scraper.adapters.linkedin.async_playwright", return_value=mock_pw), \
         patch("scraper.adapters.linkedin.get_stealth_context", new=AsyncMock(return_value=mock_context)):
        s.LINKEDIN_LI_AT = "test"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = LinkedInAdapter()
        await adapter.search(None, None, 24)

    assert "f_E=" not in captured.get("url", "")


@pytest.mark.asyncio
async def test_linkedin_remote_detection():
    """Jobs with 'Remote' in location are detected as remote work_type."""
    html = _linkedin_html(_fresh_iso(), count=1, remote=True)
    mock_pw, mock_context, _ = _make_mock_playwright(html)

    with patch("scraper.adapters.linkedin.settings") as s, \
         patch("scraper.adapters.linkedin.async_playwright", return_value=mock_pw), \
         patch("scraper.adapters.linkedin.get_stealth_context", new=AsyncMock(return_value=mock_context)):
        s.LINKEDIN_LI_AT = "test-li-at"
        s.REQUEST_TIMEOUT_SECONDS = 30
        adapter = LinkedInAdapter()
        jobs = await adapter.search(None, None, 24)

    assert len(jobs) == 1
    assert jobs[0].work_type == "remote"
