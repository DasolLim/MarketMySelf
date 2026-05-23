from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from middleware.rate_limit import limiter
from middleware.role_guard import require_role
from models.application import Application
from models.job_post import JobPost
from models.notification import Notification
from schemas.application import ApplicationStatusUpdate, ApplicationResponse, NotificationResponse
from services.notification_service import notify_application_status

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("/me", response_model=list[ApplicationResponse])
@limiter.limit("60/minute")
async def my_applications(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    return (
        db.query(Application)
        .filter(Application.seeker_id == ctx["user_id"])
        .order_by(Application.updated_at.desc())
        .all()
    )


@router.get("/notifications", response_model=list[NotificationResponse])
@limiter.limit("60/minute")
async def get_notifications(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == ctx["user_id"], Notification.is_read == False)
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.post("/notifications/{notification_id}/read", status_code=200)
@limiter.limit("60/minute")
async def mark_notification_read(
    request: Request,
    notification_id: UUID,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    note = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == ctx["user_id"],
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Notification not found")
    note.is_read = True
    db.commit()
    return {"detail": "Marked as read"}


@router.get("/{application_id}", response_model=ApplicationResponse)
@limiter.limit("120/minute")
async def get_application(
    request: Request,
    application_id: UUID,
    ctx: Annotated[dict, Depends(require_role())],
    db: Session = Depends(get_db),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    user_id = ctx["user_id"]
    role = ctx["role"]
    if role == "seeker" and str(app.seeker_id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if role == "recruiter":
        job = db.query(JobPost).filter(JobPost.id == app.job_post_id).first()
        if not job or str(job.recruiter_id) != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
    return app


@router.patch("/{application_id}/status", response_model=ApplicationResponse)
@limiter.limit("30/minute")
async def update_application_status(
    request: Request,
    application_id: UUID,
    body: ApplicationStatusUpdate,
    ctx: Annotated[dict, Depends(require_role("recruiter"))],
    db: Session = Depends(get_db),
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    job = db.query(JobPost).filter(JobPost.id == app.job_post_id).first()
    if not job or str(job.recruiter_id) != ctx["user_id"]:
        raise HTTPException(status_code=403, detail="Not your job post")

    app.status = body.status
    notify_application_status(db, app)
    db.commit()
    db.refresh(app)
    return app
