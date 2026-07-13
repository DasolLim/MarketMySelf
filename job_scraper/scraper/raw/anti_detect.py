"""
Lightweight anti-detection layer for raw scrapers.

Two methods only:
  1. Jitter delay — reuses the existing DomainThrottle (random sleep between
     requests so we never hammer a host faster than a human could browse).
  2. Header rotation — cycles a small pool of realistic browser User-Agent
     strings so repeated requests don't share an identical fingerprint.

curl_cffi TLS impersonation is applied directly in dice.py — it handles the
TLS handshake at the C level and doesn't belong here.
"""
import random

from scraper.anti_detect.throttle import DomainThrottle

# One shared throttle instance used by all raw scrapers.
# max_concurrent=1 means one in-flight request per domain at a time.
throttle = DomainThrottle(max_concurrent=1)

_USER_AGENTS = [
    # Chrome 124 macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    # Chrome 124 Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    # Chrome 123 macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    # Firefox 125 macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0",
    # Safari 17 macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
]


def random_ua() -> str:
    return random.choice(_USER_AGENTS)


def browser_headers(referer: str = "") -> dict[str, str]:
    """Return a realistic set of browser request headers with a rotated UA."""
    headers = {
        "User-Agent": random_ua(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
    }
    if referer:
        headers["Referer"] = referer
        headers["Sec-Fetch-Site"] = "same-origin"
    return headers


def json_headers() -> dict[str, str]:
    """Headers for JSON API requests (public endpoints without auth)."""
    return {
        "User-Agent": random_ua(),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
    }
