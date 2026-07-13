import random
from collections import defaultdict

from config import settings


class ProxyPool:
    """
    Manages a pool of proxies loaded from settings.PROXY_LIST.

    Falls back to direct (None) connection when the list is empty or exhausted.
    Removes a proxy permanently after 3 consecutive failures.
    """

    _FAILURE_THRESHOLD = 3

    def __init__(self) -> None:
        self._proxies: list[str] = [
            p.strip()
            for p in settings.PROXY_LIST.splitlines()
            if p.strip()
        ]
        self._failures: dict[str, int] = defaultdict(int)

    def get(self) -> str | None:
        """Return a random proxy string, or None to use a direct connection."""
        if not self._proxies:
            return None
        return random.choice(self._proxies)

    def mark_failure(self, proxy: str) -> None:
        """Increment failure count for a proxy; remove it after 3 consecutive failures."""
        self._failures[proxy] += 1
        if self._failures[proxy] >= self._FAILURE_THRESHOLD:
            try:
                self._proxies.remove(proxy)
            except ValueError:
                pass
            del self._failures[proxy]
