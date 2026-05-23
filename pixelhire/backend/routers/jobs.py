from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from middleware.rate_limit import limiter
from middleware.role_guard import require_role
from models.job_post import JobPost
from schemas.job import JobPostCreateRequest, JobPostUpdateRequest, JobPostResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobPostResponse, status_code=201)
@limiter.limit("20/minute")
async def create_job(
    request: Request,
    body: JobPostCreateRequest,
    ctx: Annotated[dict, Depends(require_role("recruiter"))],
    db: Session = Depends(get_db),
):
    job = JobPost(recruiter_id=ctx["user_id"], **body.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/browse", response_model=list[JobPostResponse])
@limiter.limit("120/minute")
async def browse_jobs(
    request: Request,
    job_category: str | None = None,
    is_active: bool = True,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    limit = min(limit, 50)
    q = db.query(JobPost).filter(JobPost.is_active == is_active)
    if job_category:
        q = q.filter(JobPost.job_category == job_category)
    offset = (page - 1) * limit
    return q.order_by(JobPost.created_at.desc()).offset(offset).limit(limit).all()


@router.get("", response_model=list[JobPostResponse])
@limiter.limit("60/minute")
async def list_my_jobs(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("recruiter"))],
    db: Session = Depends(get_db),
):
    return db.query(JobPost).filter(JobPost.recruiter_id == ctx["user_id"]).order_by(JobPost.created_at.desc()).all()


@router.get("/{job_id}", response_model=JobPostResponse)
@limiter.limit("120/minute")
async def get_job(request: Request, job_id: UUID, db: Session = Depends(get_db)):
    job = db.query(JobPost).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job post not found")
    return job


@router.patch("/{job_id}", response_model=JobPostResponse)
@limiter.limit("30/minute")
async def update_job(
    request: Request,
    job_id: UUID,
    body: JobPostUpdateRequest,
    ctx: Annotated[dict, Depends(require_role("recruiter"))],
    db: Session = Depends(get_db),
):
    job = db.query(JobPost).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job post not found")
    if str(job.recruiter_id) != ctx["user_id"]:
        raise HTTPException(status_code=403, detail="Not your job post")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=204)
@limiter.limit("10/minute")
async def delete_job(
    request: Request,
    job_id: UUID,
    ctx: Annotated[dict, Depends(require_role("recruiter"))],
    db: Session = Depends(get_db),
):
    job = db.query(JobPost).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job post not found")
    if str(job.recruiter_id) != ctx["user_id"]:
        raise HTTPException(status_code=403, detail="Not your job post")
    db.delete(job)
    db.commit()
