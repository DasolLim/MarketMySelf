from __future__ import annotations

from datetime import datetime, timezone

from elasticsearch import AsyncElasticsearch

from scraper.models import ScrapedJob
from scraper.normalizer import strip_html

JOBS_MAPPING: dict = {
    "mappings": {
        "properties": {
            # Identity
            "id":          {"type": "keyword"},
            "source":      {"type": "keyword"},
            "source_urls": {"type": "keyword"},

            # Full-text search fields
            "title": {
                "type": "text",
                "analyzer": "english",
                "fields": {
                    "keyword": {"type": "keyword"},
                },
            },
            "company_name": {
                "type": "text",
                "analyzer": "english",
                "fields": {
                    "keyword": {"type": "keyword"},
                    "lower":   {"type": "keyword", "normalizer": "lowercase_normalizer"},
                },
            },
            "description_text": {
                "type": "text",
                "analyzer": "english",
                "index_options": "offsets",
            },

            # Filterable enums — keyword only
            "work_type":       {"type": "keyword"},
            "exp_level":       {"type": "keyword"},
            "employment_type": {"type": "keyword"},
            "category":        {"type": "keyword"},

            # Filterable skills array — case-insensitive via lowercase normalizer
            "skills": {"type": "keyword", "normalizer": "lowercase_normalizer"},

            # Salary range — integer for range queries
            "salary_min":      {"type": "integer"},
            "salary_max":      {"type": "integer"},
            "salary_currency": {"type": "keyword"},

            # Location
            "location_city":    {"type": "keyword"},
            "location_country": {"type": "keyword"},
            "location": {
                "type": "geo_point",
            },

            # Dates
            "posted_at":  {"type": "date"},
            "scraped_at": {"type": "date"},
            "expires_at": {"type": "date"},

            # Metadata
            "is_active":            {"type": "boolean"},
            "exp_level_confidence": {"type": "float"},
        },
    },
    "settings": {
        "number_of_shards":   1,
        "number_of_replicas": 0,
        "refresh_interval":   "1s",
        "analysis": {
            "normalizer": {
                "lowercase_normalizer": {
                    "type":        "custom",
                    "char_filter": [],
                    "filter":      ["lowercase"],
                },
            },
        },
    },
}


async def create_index(es: AsyncElasticsearch, index: str) -> None:
    """Create the jobs index. No-op if it already exists."""
    exists = await es.indices.exists(index=index)
    if exists.body:
        print(f"[es] index '{index}' already exists")
        return
    await es.indices.create(index=index, body=JOBS_MAPPING)
    print(f"[es] index '{index}' created")


async def delete_index(es: AsyncElasticsearch, index: str) -> None:
    """Delete the index. Used for full reindex with mapping changes."""
    print(f"[es] WARNING: deleting index '{index}'")
    await es.indices.delete(index=index, ignore_unavailable=True)


def build_document(job: ScrapedJob) -> dict:
    """Convert a ScrapedJob into the flat dict indexed into ES.

    None values are omitted. skills and source_urls are always included.
    """
    now_utc = datetime.now(timezone.utc)

    doc: dict = {
        "source_urls": job.source_urls,
        "skills":      [s.lower() for s in (job.skills or [])],
    }

    # String identity fields — omit if falsy
    for attr, key in (
        ("id",     "id"),
        ("source", "source"),
    ):
        val = getattr(job, attr, None)
        if val:
            doc[key] = val

    # title / company rename
    if job.title:
        doc["title"] = job.title
    if job.company:
        doc["company_name"] = job.company

    # description — strip any residual HTML tags before indexing
    if job.description_text:
        doc["description_text"] = strip_html(job.description_text) or job.description_text

    # enum / keyword fields — omit None
    for attr, key in (
        ("work_type",        "work_type"),
        ("experience_level", "exp_level"),   # renamed for ES
        ("employment_type",  "employment_type"),
        ("category",         "category"),
    ):
        val = getattr(job, attr, None)
        if val is not None:
            doc[key] = val

    # numeric salary — omit None
    if job.salary_min is not None:
        doc["salary_min"] = job.salary_min
    if job.salary_max is not None:
        doc["salary_max"] = job.salary_max
    if job.salary_currency:
        doc["salary_currency"] = job.salary_currency

    # location keywords — omit None
    if job.location_city:
        doc["location_city"] = job.location_city
    if job.location_country:
        doc["location_country"] = job.location_country

    # geo_point — only include when both lat and lng are present
    lat = getattr(job, "location_lat", None)
    lng = getattr(job, "location_lng", None)
    if lat is not None and lng is not None:
        doc["location"] = {"lat": lat, "lon": lng}

    # dates — ISO 8601 strings; omit None
    for attr in ("posted_at", "scraped_at", "expires_at"):
        val: datetime | None = getattr(job, attr, None)
        if val is not None:
            doc[attr] = val.isoformat()

    # is_active — computed from expires_at
    expires = getattr(job, "expires_at", None)
    doc["is_active"] = (expires is None) or (expires > now_utc)

    # confidence float — always include
    doc["exp_level_confidence"] = getattr(job, "exp_level_confidence", 0.0)

    return doc
