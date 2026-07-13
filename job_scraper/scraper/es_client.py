from __future__ import annotations

from elasticsearch import AsyncElasticsearch

from config import settings

_client: AsyncElasticsearch | None = None


def get_es_client() -> AsyncElasticsearch | None:
    """Return the module-level AsyncElasticsearch singleton, or None if not configured."""
    global _client
    if not settings.ELASTICSEARCH_URL:
        return None
    if _client is None:
        _client = AsyncElasticsearch(
            settings.ELASTICSEARCH_URL,
            api_key=settings.ELASTICSEARCH_API_KEY or None,
            retry_on_timeout=True,
            max_retries=3,
            request_timeout=30,
        )
    return _client
