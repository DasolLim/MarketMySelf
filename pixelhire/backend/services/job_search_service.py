import math
from datetime import datetime
from functools import lru_cache
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

from models.scraped_job import ScrapedJob
from schemas.scraped_job import (
    ScrapedJobFilters,
    ScrapedJobFacets,
    ScrapedJobResponse,
    ScrapedJobsResponse,
)


def search_scraped_jobs(filters: ScrapedJobFilters, db: Session) -> ScrapedJobsResponse:
    page_size = min(filters.page_size, 50)
    offset = (filters.page - 1) * page_size

    conditions = ["is_active = TRUE", "expires_at > now()"]
    params: dict = {}

    if filters.keywords:
        conditions.append(
            "to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description_text, ''))"
            " @@ plainto_tsquery('english', :keywords)"
        )
        params["keywords"] = filters.keywords

    if filters.category:
        conditions.append("category = :category")
        params["category"] = filters.category

    if filters.experience_level:
        conditions.append("experience_level = :experience_level")
        params["experience_level"] = filters.experience_level

    if filters.work_type:
        conditions.append("work_type = :work_type")
        params["work_type"] = filters.work_type

    if filters.employment_type:
        conditions.append("employment_type = :employment_type")
        params["employment_type"] = filters.employment_type

    if filters.company:
        conditions.append("company ILIKE :company")
        params["company"] = f"%{filters.company}%"

    if filters.location_city:
        conditions.append("location_city ILIKE :location_city")
        params["location_city"] = f"%{filters.location_city}%"

    if filters.skills:
        placeholders = ", ".join(f":skill_{i}" for i in range(len(filters.skills)))
        conditions.append(f"skills @> ARRAY[{placeholders}]::text[]")
        for i, skill in enumerate(filters.skills):
            params[f"skill_{i}"] = skill

    if filters.salary_min is not None:
        conditions.append("salary_max >= :salary_min")
        params["salary_min"] = filters.salary_min

    conditions.append("posted_at >= now() - make_interval(hours => :posted_within_hours)")
    params["posted_within_hours"] = filters.posted_within_hours

    where_clause = " AND ".join(conditions)

    if filters.keywords:
        order_clause = (
            "ts_rank(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description_text, '')),"
            " plainto_tsquery('english', :keywords)) DESC, posted_at DESC"
        )
    else:
        order_clause = "posted_at DESC"

    sql = text(f"""
        SELECT
            id, source, source_id, source_url, title, company, company_id,
            location_city, location_country, remote_raw, work_type, employment_type,
            experience_level, category, description, description_text, skills,
            salary_min, salary_max, salary_raw, posted_at, scraped_at, expires_at,
            is_active,
            COUNT(*) OVER() AS total_count
        FROM public.scraped_jobs
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT :page_size OFFSET :offset
    """)

    params["page_size"] = page_size
    params["offset"] = offset

    rows = db.execute(sql, params).mappings().all()

    total = rows[0]["total_count"] if rows else 0
    pages = math.ceil(total / page_size) if total > 0 else 1

    jobs = [
        ScrapedJobResponse(
            id=row["id"],
            source=row["source"],
            source_url=row["source_url"],
            title=row["title"],
            company=row["company"],
            location_city=row["location_city"],
            location_country=row["location_country"],
            work_type=row["work_type"],
            employment_type=row["employment_type"],
            experience_level=row["experience_level"],
            category=row["category"],
            description=row["description"],
            description_text=row["description_text"],
            skills=row["skills"] or [],
            salary_min=row["salary_min"],
            salary_max=row["salary_max"],
            posted_at=row["posted_at"],
            scraped_at=row["scraped_at"],
            expires_at=row["expires_at"],
        )
        for row in rows
    ]

    return ScrapedJobsResponse(
        jobs=jobs,
        total=total,
        page=filters.page,
        page_size=page_size,
        pages=pages,
    )


def get_scraped_job(job_id: str, db: Session) -> Optional[ScrapedJob]:
    sql = text("""
        SELECT * FROM public.scraped_jobs
        WHERE id = :job_id AND is_active = TRUE AND expires_at > now()
    """)
    row = db.execute(sql, {"job_id": job_id}).mappings().first()
    if row is None:
        return None
    job = ScrapedJob()
    for key, value in row.items():
        setattr(job, key, value)
    return job


@lru_cache(maxsize=24)
def _cached_facets(hour_key: str, db_url: str):
    from database import SessionLocal
    db = SessionLocal()
    try:
        return _fetch_facets(db)
    finally:
        db.close()


def get_facets(db: Session) -> ScrapedJobFacets:
    hour_key = str(datetime.utcnow().replace(minute=0, second=0, microsecond=0))
    from database import engine
    return _cached_facets(hour_key, str(engine.url))


def _fetch_facets(db: Session) -> ScrapedJobFacets:
    sql = text("""
        SELECT
            work_type,
            experience_level,
            category,
            COUNT(*) AS count
        FROM public.scraped_jobs
        WHERE is_active = TRUE AND expires_at > now()
        GROUP BY GROUPING SETS (
            (work_type),
            (experience_level),
            (category)
        )
    """)
    rows = db.execute(sql).mappings().all()

    work_type: dict[str, int] = {}
    experience_level: dict[str, int] = {}
    category: dict[str, int] = {}

    for row in rows:
        count = int(row["count"])
        if row["work_type"] is not None and row["experience_level"] is None and row["category"] is None:
            work_type[row["work_type"]] = count
        elif row["experience_level"] is not None and row["work_type"] is None and row["category"] is None:
            experience_level[row["experience_level"]] = count
        elif row["category"] is not None and row["work_type"] is None and row["experience_level"] is None:
            category[row["category"]] = count

    return ScrapedJobFacets(
        work_type=work_type,
        experience_level=experience_level,
        category=category,
    )
