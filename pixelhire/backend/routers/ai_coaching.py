import json
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from middleware.rate_limit import limiter
from middleware.role_guard import require_role
from models.coaching_session import CoachingSession
from models.resume_analysis import ResumeAnalysis
from schemas.resume_analysis import (
    FeatureType,
    ResumeAnalysisHistoryItem,
    ResumeAnalysisResponse,
    ValidationResult,
)
from services.ai_coaching_service import analyze_resume as _legacy_analyze, generate_interview_questions
from services.ai_resume_service import analyze_resume as analyze_resume_file

router = APIRouter(prefix="/coaching", tags=["coaching"])


class ResumeSubmitRequest(BaseModel):
    resume_text: str


class InterviewRequest(BaseModel):
    job_category: str | None = None
    skills: list[str] = []


class CoachingSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    input_text: str | None = None
    feedback: str | None = None
    questions: list[str] | None = None
    created_at: str

    model_config = {"from_attributes": True}

    def model_post_init(self, __context) -> None:
        if hasattr(self, "created_at") and not isinstance(self.created_at, str):
            object.__setattr__(self, "created_at", str(self.created_at))


@router.post("/resume", status_code=201)
@limiter.limit("5/minute")
async def submit_resume(
    request: Request,
    body: ResumeSubmitRequest,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    if not body.resume_text.strip():
        raise HTTPException(status_code=400, detail="resume_text is required")
    session = _legacy_analyze(db, ctx["user_id"], body.resume_text)
    db.commit()
    db.refresh(session)
    return {
        "id": str(session.id),
        "type": session.type,
        "feedback": session.feedback,
        "created_at": str(session.created_at),
    }


@router.post("/interview", status_code=201)
@limiter.limit("5/minute")
async def start_interview_prep(
    request: Request,
    body: InterviewRequest,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    session = generate_interview_questions(db, ctx["user_id"], body.job_category, body.skills)
    db.commit()
    db.refresh(session)
    return {
        "id": str(session.id),
        "type": session.type,
        "questions": session.questions,
        "created_at": str(session.created_at),
    }


@router.get("/history")
@limiter.limit("30/minute")
async def coaching_history(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(CoachingSession)
        .filter(CoachingSession.user_id == ctx["user_id"])
        .order_by(CoachingSession.created_at.desc())
        .all()
    )
    return [
        {
            "id": str(s.id),
            "type": s.type,
            "feedback": s.feedback,
            "questions": s.questions,
            "created_at": str(s.created_at),
        }
        for s in sessions
    ]


# ── AI Resume Analysis ────────────────────────────────────────────────────────

@router.post("/resume-analyze")
@limiter.limit("5/minute")
async def resume_analyze(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
    job_position: str = Form(...),
    company: str = Form(...),
    job_description: str = Form(...),
    feature: FeatureType = Form(...),
    missing_keywords: str = Form(default="[]"),
    resume: UploadFile = File(...),
):
    if resume is None:
        raise HTTPException(status_code=422, detail="Resume file is required")

    try:
        parsed_keywords: list[str] = json.loads(missing_keywords)
    except (json.JSONDecodeError, ValueError):
        parsed_keywords = []

    file_bytes = await resume.read()
    filename   = resume.filename or "resume"

    record, validation_error = await analyze_resume_file(
        file_bytes=file_bytes,
        filename=filename,
        job_position=job_position,
        company=company,
        job_description=job_description,
        feature=feature,
        missing_keywords=parsed_keywords,
        user_id=uuid.UUID(ctx["user_id"]),
        db=db,
    )

    if validation_error is not None:
        raise HTTPException(status_code=422, detail=validation_error.model_dump())

    db.commit()
    db.refresh(record)

    return ResumeAnalysisResponse(
        analysis_id = record.id,
        feature     = record.feature,
        result      = record.parsed_response or {},
        model_used  = record.model_used,
        latency_ms  = record.latency_ms or 0,
        created_at  = record.created_at,
    )


@router.get("/resume-analyze/history")
@limiter.limit("30/minute")
async def resume_analyze_history(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    rows = (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.user_id == uuid.UUID(ctx["user_id"]))
        .order_by(ResumeAnalysis.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        ResumeAnalysisHistoryItem(
            analysis_id  = r.id,
            feature      = r.feature,
            job_position = r.job_position,
            company      = r.company,
            created_at   = r.created_at,
        )
        for r in rows
    ]


@router.get("/resume-analyze/{analysis_id}")
@limiter.limit("60/minute")
async def resume_analyze_get(
    request: Request,
    analysis_id: uuid.UUID,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    record = db.query(ResumeAnalysis).filter(ResumeAnalysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if str(record.user_id) != ctx["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    return ResumeAnalysisResponse(
        analysis_id = record.id,
        feature     = record.feature,
        result      = record.parsed_response or {},
        model_used  = record.model_used,
        latency_ms  = record.latency_ms or 0,
        created_at  = record.created_at,
    )
