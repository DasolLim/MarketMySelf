import pytest


# Make pytest-asyncio apply to all async tests automatically
def pytest_configure(config):
    config.addinivalue_line("markers", "asyncio: mark test as async")
