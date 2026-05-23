from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from database import get_db
from middleware.rate_limit import limiter
from middleware.role_guard import require_role
from schemas.search import NotifyRequest, SearchResultItem
from services.search_service import SearchFilters, filter_seekers
from services.notification_service import notify_user

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/users", response_model=list[SearchResultItem])
@limiter.limit("60/minute")
async def search_users(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("recruiter"))],
    db: Session = Depends(get_db),
    job_category: Optional[str] = None,
    experience_level: Optional[str] = None,
    tech_skills: Optional[str] = None,
    soft_skills: Optional[str] = None,
    keyword: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    tech = [s.strip() for s in tech_skills.split(",")] if tech_skills else []
    soft = [s.strip() for s in soft_skills.split(",")] if soft_skills else []
    filters = SearchFilters(
        job_category=job_category,
        experience_level=experience_level,
        tech_skills=tech,
        soft_skills=soft,
        keyword=keyword,
        page=page,
        limit=limit,
    )
    return filter_seekers(db, filters)


@router.get("/talent", response_model=list[SearchResultItem])
@limiter.limit("120/minute")
async def browse_talent(
    request: Request,
    job_category: Optional[str] = None,
    experience_level: Optional[str] = None,
    page: int = 1,
    limit: int = 24,
    db: Session = Depends(get_db),
):
    filters = SearchFilters(
        job_category=job_category,
        experience_level=experience_level,
        page=page,
        limit=min(limit, 48),
    )
    return filter_seekers(db, filters)


@router.post("/notify", status_code=200)
@limiter.limit("10/minute")
async def notify_match(
    request: Request,
    body: NotifyRequest,
    ctx: Annotated[dict, Depends(require_role("recruiter"))],
    db: Session = Depends(get_db),
):
    notify_user(
        db,
        user_id=str(body.user_id),
        type="recruiter_interest",
        subject="A recruiter is interested in your profile",
        body=body.message,
    )
    db.commit()
    return {"detail": "Notification sent"}
