from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from database import get_db
from middleware.rate_limit import limiter
from schemas.scraped_job import (
    ScrapedJobDetail,
    ScrapedJobSearchResponse,
)
from services import scraped_job_service

router = APIRouter(prefix="/scraped-jobs", tags=["Scraped Jobs"])


@router.get("/search", response_model=ScrapedJobSearchResponse)
@limiter.limit("120/minute")
async def search_scraped_jobs(
    request: Request,
    query: str = "",
    work_types: list[str] = Query(default=[]),
    experience_levels: list[str] = Query(default=[]),
    employment_types: list[str] = Query(default=[]),
    skills: list[str] = Query(default=[]),
    salary_min: int | None = None,
    salary_max: int | None = None,
    location_city: str | None = None,
    company: str | None = None,
    sources: list[str] = Query(default=[]),
    category: str | None = None,
    posted_within_days: int | None = None,
    page: int = 0,
    page_size: int = Query(default=20, ge=1, le=100),
    include_facets: bool = False,
    db: Session = Depends(get_db),
):
    from schemas.scraped_job import ScrapedJobSearchParams

    params = ScrapedJobSearchParams(
        query=query,
        work_types=work_types,
        experience_levels=experience_levels,
        employment_types=employment_types,
        skills=skills,
        salary_min=salary_min,
        salary_max=salary_max,
        location_city=location_city,
        company=company,
        sources=sources,
        category=category,
        posted_within_days=posted_within_days,
        page=max(0, page),
        page_size=page_size,
    )
    return scraped_job_service.search_scraped_jobs(params, db, include_facets=include_facets)


@router.get("/{job_id}", response_model=ScrapedJobDetail)
@limiter.limit("120/minute")
async def get_scraped_job(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db),
):
    job = scraped_job_service.get_scraped_job(job_id, db)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or has expired")
    return job
