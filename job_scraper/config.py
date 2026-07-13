from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Browser-based boards
    LINKEDIN_LI_AT: str = ""
    WELLFOUND_SESSION: str = ""
    GLASSDOOR_SESSION: str = ""

    # Optional API keys (fallback to scrape if empty)
    ZIPRECRUITER_API_KEY: str = ""
    SERPAPI_KEY: str = ""

    # Phase 1 raw sources
    JSEARCH_KEY: str = ""       # RapidAPI key for JSearch
    ADZUNA_APP_ID: str = ""
    ADZUNA_APP_KEY: str = ""

    # Anti-detect
    PROXY_LIST: str = ""
    PLAYWRIGHT_HEADLESS: bool = True

    # Database
    DATABASE_URL: str = ""  # postgresql://user:pass@host:5432/dbname

    # Elasticsearch
    ELASTICSEARCH_URL:     str = ""
    ELASTICSEARCH_API_KEY: str = ""
    ELASTICSEARCH_INDEX:   str = "jobs"

    # Scraper behaviour
    MAX_AGE_HOURS: int = 24
    REQUEST_TIMEOUT_SECONDS: int = 30
    CONCURRENT_ADAPTERS: int = 4
    SCRAPE_INTERVAL_HOURS: int = 1

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
