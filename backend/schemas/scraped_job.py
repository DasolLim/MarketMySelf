from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ScrapedJobSearchParams(BaseModel):
    query: str = ""
    work_types: list[str] = []
    experience_levels: list[str] = []
    employment_types: list[str] = []
    skills: list[str] = []
    salary_min: int | None = None
    salary_max: int | None = None
    location_city: str | None = None
    company: str | None = None
    sources: list[str] = []
    category: str | None = None
    posted_within_days: int | None = None
    page: int = 0
    page_size: int = Field(default=20, ge=1, le=100)


class ScrapedJobCard(BaseModel):
    id: str
    title: str
    company: str
    company_slug: str | None = None
    work_type: str | None = None
    experience_level: str | None = None
    employment_type: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str | None = None
    salary_raw: str | None = None
    location_city: str | None = None
    location_country: str | None = None
    source: str
    source_urls: list[str]
    posted_at: datetime | None = None
    scraped_at: datetime | None = None
    skills: list[str]
    category: str | None = None
    remote_raw: str | None = None


class ScrapedJobDetail(ScrapedJobCard):
    description_text: str | None = None
    description_html: str | None = None


class ScrapedJobFacets(BaseModel):
    work_types: dict[str, int]
    experience_levels: dict[str, int]
    employment_types: dict[str, int]
    categories: dict[str, int]
    top_skills: dict[str, int]
    salary_stats: dict[str, Any]


class ScrapedJobSearchResponse(BaseModel):
    jobs: list[ScrapedJobCard]
    total: int
    page: int
    page_size: int
    took_ms: float
    facets: ScrapedJobFacets | None = None
