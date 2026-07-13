import random
import uuid
from pathlib import Path

from playwright.async_api import BrowserContext, Playwright
from playwright_stealth import Stealth

_stealth = Stealth()

from config import settings


CHROME_USER_AGENTS: list[str] = [
    # Windows — Chrome 124
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    # Windows — Chrome 123
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    # Windows — Chrome 122
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.112 Safari/537.36",
    # macOS — Chrome 124
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    # macOS — Chrome 123
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    # macOS — Chrome 122
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.94 Safari/537.36",
    # macOS M-series — Chrome 124
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Safari/537.36",
    # Windows — Chrome 121
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    # Windows — Chrome 120
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    # macOS — Chrome 120
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]


async def get_stealth_context(
    playwright: Playwright,
    proxy: str | None = None,
    headless: bool | None = None,
) -> BrowserContext:
    """
    Launch a Chromium browser context hardened against bot detection.

    Applies playwright-stealth patches, randomises the user-agent and viewport,
    pins locale/timezone, and isolates each invocation in its own temp profile.
    """
    if headless is None:
        headless = settings.PLAYWRIGHT_HEADLESS

    user_agent = random.choice(CHROME_USER_AGENTS)
    width = random.randint(1280, 1920)
    height = random.randint(800, 1080)
    profile_dir = Path("/tmp/job_scraper") / str(uuid.uuid4())
    profile_dir.mkdir(parents=True, exist_ok=True)

    proxy_config = {"server": proxy} if proxy else None

    context: BrowserContext = await playwright.chromium.launch_persistent_context(
        str(profile_dir),
        headless=headless,
        user_agent=user_agent,
        viewport={"width": width, "height": height},
        locale="en-US",
        timezone_id="America/New_York",
        proxy=proxy_config,
        args=["--disable-blink-features=AutomationControlled"],
    )

    # Apply stealth patches to every existing and future page in this context
    for page in context.pages:
        await _stealth.apply_stealth_async(page)

    context.on("page", lambda page: _stealth.apply_stealth_async(page))

    return context
