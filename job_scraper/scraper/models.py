from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta


@dataclass
class ScrapedJob:
    # Dedup key — SHA-256[:32] of title|company|desc[:300]
    content_hash: str
    source: str
    source_urls: list[str]
    source_job_id: str | None = None

    # Postgres UUID — set after upsert, used as ES document ID
    id: str | None = None

    title: str = ""
    company: str = ""
    company_slug: str | None = None

    location_city: str | None = None
    location_country: str = "US"
    remote_raw: str | None = None

    # Populated by future geocoding step; drives ES geo_point queries
    location_lat: float | None = None
    location_lng: float | None = None

    work_type: str | None = None         # 'remote'|'hybrid'|'on_site'
    employment_type: str | None = None   # 'full_time'|'part_time'|'contract'|'internship'
    experience_level: str | None = None  # 'internship'|'entry'|'mid'|'senior'|'lead'|'executive'
    exp_level_confidence: float = 0.0
    category: str | None = None

    description_html: str | None = None
    description_text: str | None = None
    skills: list[str] = field(default_factory=list)

    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str = "USD"
    salary_raw: str | None = None

    posted_at: datetime | None = None
    scraped_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc) + timedelta(hours=72)
    )

    def to_dict(self) -> dict:
        result = {}
        for k, v in self.__dict__.items():
            if isinstance(v, datetime):
                result[k] = v.isoformat()
            else:
                result[k] = v
        return result
