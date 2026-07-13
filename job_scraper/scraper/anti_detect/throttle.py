import asyncio
import random


class DomainThrottle:
    """Per-domain rate limiter using asyncio.Semaphore with jittered sleep."""

    def __init__(self, max_concurrent: int = 1) -> None:
        self._semaphores: dict[str, asyncio.Semaphore] = {}
        self._max_concurrent = max_concurrent

    def _semaphore(self, domain: str) -> asyncio.Semaphore:
        if domain not in self._semaphores:
            self._semaphores[domain] = asyncio.Semaphore(self._max_concurrent)
        return self._semaphores[domain]

    async def wait(self, domain: str, base_seconds: float) -> None:
        """Acquire the domain semaphore then sleep for a jittered interval."""
        async with self._semaphore(domain):
            delay = random.uniform(base_seconds, base_seconds * 2)
            await asyncio.sleep(delay)

    async def backoff(self, domain: str, attempt: int) -> None:
        """Exponential back-off: 2^attempt seconds, capped at 60s."""
        delay = min(2 ** attempt, 60)
        await asyncio.sleep(delay)
