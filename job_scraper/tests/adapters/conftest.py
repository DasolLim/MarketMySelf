"""
Shared fixtures for all adapter tests.

Patches DomainThrottle.wait to a no-op so tests don't incur real sleep delays.
"""
from unittest.mock import AsyncMock, patch

import pytest


@pytest.fixture(autouse=True)
def no_throttle():
    """Replace DomainThrottle.wait with an instant no-op for every adapter test."""
    with patch(
        "scraper.anti_detect.throttle.DomainThrottle.wait",
        new=AsyncMock(return_value=None),
    ):
        yield
