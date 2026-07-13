"""
PlaywrightBaseAdapter — shared anti-detection Playwright engine for all job boards.

Counter-technique mapping (inherited by every subclass automatically):
  Request rate       → DomainThrottle: random jittered delays between every action
  IP reputation      → ProxyPool: rotate residential proxies, retire on failure
  Browser fingerprint→ get_stealth_context: real Chromium + playwright_stealth patches
  User-agent         → random.choice(CHROME_USER_AGENTS) per session (via get_stealth_context)
  Session behaviour  → optional natural homepage visit + human simulation before search
  Bot-detection JS   → stealth patches hide navigator.webdriver and all automation flags
  Network interception→ optional XHR/fetch response capture (intercept_path)

Subclasses must implement two methods only:
  _build_search_url(keywords, company, max_age_hours) → str
  _parse_page(html, captured_responses, max_age_hours) → list[ScrapedJob]

Subclasses may also override:
  _session_cookies()     → list[dict]   inject auth cookies before any navigation
  home_url               → str | None   visit homepage first for a natural browsing path
  wait_selector          → str | None   CSS selector to wait for after search page loads
  intercept_path         → str | None   URL path fragment to capture via response interception
  block_signals          → tuple[str]   extend or replace the default bot-detection signals
  max_retries            → int          number of proxy-rotation attempts before giving up
"""
import asyncio
import random
from abc import abstractmethod

from playwright.async_api import Page, Response, async_playwright

from scraper.adapters.base import BaseAdapter
from scraper.anti_detect.browser_profile import get_stealth_context
from scraper.anti_detect.proxy_pool import ProxyPool
from scraper.anti_detect.throttle import DomainThrottle
from scraper.models import ScrapedJob

_throttle = DomainThrottle()

_DEFAULT_BLOCK_SIGNALS: tuple[str, ...] = (
    "just a moment",
    "access denied",
    "verify you are human",
    "captcha",
    "challenge-platform",
    "please enable cookies",
    "are you a robot",
    "robot or human",
)


class PlaywrightBaseAdapter(BaseAdapter):
    """
    Abstract base that provides the full Playwright anti-detection suite.

    Subclasses set class-level attributes to configure behaviour and implement
    _build_search_url + _parse_page to supply board-specific logic.
    """

    # ── subclass configuration (override as needed) ───────────────────────
    home_url: str | None = None
    block_signals: tuple[str, ...] = _DEFAULT_BLOCK_SIGNALS
    max_retries: int = 2
    wait_selector: str | None = None
    intercept_path: str | None = None

    # ── abstract interface ────────────────────────────────────────────────

    @abstractmethod
    def _build_search_url(
        self,
        keywords: str | None,
        company: str | None,
        max_age_hours: int,
    ) -> str:
        """Return the fully-qualified URL for the job search page."""

    @abstractmethod
    def _parse_page(
        self,
        html: str,
        captured: list[dict],
        max_age_hours: int,
    ) -> list[ScrapedJob]:
        """
        Parse the rendered page into ScrapedJob objects.

        `captured` contains any JSON responses intercepted via intercept_path
        (empty list when intercept_path is None or no responses were captured).
        """

    def _session_cookies(self) -> list[dict]:
        """
        Return cookies to inject into the browser context before any navigation.
        Override when the board requires an authenticated session.
        Each dict must include at minimum: name, value, domain, path.
        """
        return []

    # ── public template method ────────────────────────────────────────────

    async def _playwright_search(
        self,
        keywords: str | None,
        company: str | None,
        max_age_hours: int,
    ) -> list[ScrapedJob]:
        """
        Drive a Playwright session with retry-and-proxy-rotation.

        Returns an empty list when all retries are exhausted or when the
        board is consistently blocking requests.
        """
        proxy_pool = ProxyPool()
        proxy = proxy_pool.get()

        for attempt in range(self.max_retries):
            try:
                result = await self._run_playwright(keywords, company, max_age_hours, proxy)
                if result is not None:
                    return result
                self._log(f"bot detected on attempt {attempt + 1}, rotating proxy")
                if proxy:
                    proxy_pool.mark_failure(proxy)
                proxy = proxy_pool.get()
            except Exception as exc:
                self._log(f"Playwright attempt {attempt + 1} error: {exc}")
                if proxy:
                    proxy_pool.mark_failure(proxy)
                proxy = proxy_pool.get()

            await _throttle.backoff(self.domain, attempt)

        return []

    # ── single Playwright session ─────────────────────────────────────────

    async def _run_playwright(
        self,
        keywords: str | None,
        company: str | None,
        max_age_hours: int,
        proxy: str | None,
    ) -> list[ScrapedJob] | None:
        """
        One full Playwright session: setup → optional homepage → search → parse.

        Returns None when a bot-detection challenge is confirmed (the caller
        retries with a fresh proxy).  Returns [] when the session succeeds but
        yields no jobs.
        """
        captured: list[dict] = []

        async with async_playwright() as pw:
            context = await get_stealth_context(pw, proxy=proxy)
            page = context.pages[0] if context.pages else await context.new_page()

            for cookie in self._session_cookies():
                await context.add_cookies([cookie])

            if self.intercept_path:
                async def on_response(response: Response) -> None:
                    if self.intercept_path in response.url and response.status == 200:
                        try:
                            data = await response.json()
                            if isinstance(data, dict) and "data" in data:
                                captured.append(data)
                        except Exception:
                            pass
                page.on("response", on_response)

            try:
                # Optional: natural homepage visit before the search URL
                if self.home_url:
                    await _throttle.wait(self.domain, self.rate_limit_seconds)
                    await page.goto(
                        self.home_url,
                        wait_until="domcontentloaded",
                        timeout=30_000,
                    )
                    await self._simulate_human(page)
                    if await self._is_blocked(page):
                        await context.close()
                        return None

                # Navigate to the board's search results page
                search_url = self._build_search_url(keywords, company, max_age_hours)
                await _throttle.wait(self.domain, self.rate_limit_seconds)
                nav_response = await page.goto(
                    search_url,
                    wait_until="domcontentloaded",
                    timeout=30_000,
                )
                if nav_response and nav_response.status not in (200, 304):
                    self._log(f"search page returned status {nav_response.status}")
                    await context.close()
                    return []

                await self._simulate_human(page)

                if await self._is_blocked(page):
                    await context.close()
                    return None

                if self.wait_selector:
                    try:
                        await page.wait_for_selector(self.wait_selector, timeout=8_000)
                    except Exception:
                        pass

                # Give async XHR/fetch time to fire when interception is active
                if self.intercept_path:
                    await asyncio.sleep(random.uniform(1.5, 3.0))

                html = await page.content()

            finally:
                try:
                    await context.close()
                except Exception:
                    pass

        return self._parse_page(html, captured, max_age_hours)

    # ── shared helpers ────────────────────────────────────────────────────

    async def _simulate_human(self, page: Page) -> None:
        """Random delay, mouse jitter, and a short scroll to mimic a real visitor."""
        await asyncio.sleep(random.uniform(1.5, 3.5))
        for _ in range(random.randint(2, 5)):
            await page.mouse.move(
                random.randint(80, 1200),
                random.randint(80, 700),
            )
            await asyncio.sleep(random.uniform(0.08, 0.35))
        scroll_px = random.randint(180, 550)
        await page.evaluate(f"window.scrollBy(0, {scroll_px})")
        await asyncio.sleep(random.uniform(0.8, 2.0))

    async def _is_blocked(self, page: Page) -> bool:
        """Return True if the current page contains a known bot-detection signal."""
        try:
            content = (await page.content()).lower()
            return any(sig in content for sig in self.block_signals)
        except Exception:
            return False
