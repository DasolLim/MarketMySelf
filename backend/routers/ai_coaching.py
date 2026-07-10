import json
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from middleware.rate_limit import limiter
from middleware.role_guard import require_role
from models.coaching_session import CoachingSession
from models.cover_letter import CoverLetter
from models.interview_prep import InterviewAnswer, InterviewSession, QuestionSet
from models.resume_analysis import ResumeAnalysis
from schemas.cover_letter import (
    CoverLetterHistoryItem,
    CoverLetterResponse,
    DEFAULT_WRITING_STYLE,
    DefaultWritingStyleResponse,
)
from schemas.interview_prep import (
    AnswerFeedbackResponse,
    AnswerHistoryItem,
    CreateSessionRequest,
    GeneratedAnswerResponse,
    GenerateQuestionsRequest,
    InterviewSessionResponse,
    QuestionSetHistoryItem,
    QuestionSetResponse,
    SessionHistoryItem,
    SubmitAnswerRequest,
    UpdateSessionRequest,
)
from schemas.resume_analysis import (
    FeatureType,
    ResumeAnalysisHistoryItem,
    ResumeAnalysisResponse,
    ValidationResult,
)
from services.ai_coaching_service import analyze_resume as _legacy_analyze, generate_interview_questions
from services.ai_resume_service import analyze_resume as analyze_resume_file
from services.cover_letter_service import generate_cover_letter as _generate_cover_letter
from services.interview_prep_service import (
    create_question_set as _create_question_set,
    generate_model_answer as _generate_model_answer,
    submit_and_evaluate_answer as _submit_and_evaluate_answer,
    save_interview_session,
    update_interview_session as _update_interview_session,
)

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


# ── Cover Letter ──────────────────────────────────────────────────────────────

@router.get("/cover-letter/default-style")
@limiter.limit("60/minute")
async def cover_letter_default_style(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
):
    return DefaultWritingStyleResponse(writing_style=DEFAULT_WRITING_STYLE)


@router.post("/cover-letter", status_code=200)
@limiter.limit("5/minute")
async def cover_letter_generate(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
    job_position:    str = Form(...),
    company:         str = Form(...),
    job_description: str = Form(...),
    writing_style:   str = Form(default=""),
    max_characters:  int = Form(default=1500),
    resume: UploadFile = File(...),
):
    if not job_position.strip():
        raise HTTPException(status_code=422, detail="job_position is required")
    if not company.strip():
        raise HTTPException(status_code=422, detail="company is required")
    if len(job_description.strip()) < 50:
        raise HTTPException(status_code=422, detail="job_description must be at least 50 characters")
    if not (500 <= max_characters <= 3000):
        raise HTTPException(status_code=422, detail="max_characters must be between 500 and 3000")

    effective_style = writing_style.strip() or DEFAULT_WRITING_STYLE
    file_bytes = await resume.read()
    filename   = resume.filename or "resume"

    try:
        record = await _generate_cover_letter(
            job_position=job_position,
            company=company,
            job_description=job_description,
            writing_style=effective_style,
            max_characters=max_characters,
            file_bytes=file_bytes,
            filename=filename,
            user_id=uuid.UUID(ctx["user_id"]),
            db=db,
        )
    except ValueError as exc:
        error_map = {
            "WRONG_TYPE": "Only PDF and DOCX resume files are accepted.",
            "UNREADABLE": "We couldn't read your resume. Try re-saving it as a PDF.",
        }
        raise HTTPException(status_code=422, detail=error_map.get(str(exc), str(exc)))

    db.commit()
    db.refresh(record)

    if record.raw_response:
        from services.ai_resume_service import safe_parse_json
        parsed, _ = safe_parse_json(record.raw_response)
    else:
        parsed = {}

    return CoverLetterResponse(
        cover_letter_id   = record.id,
        cover_letter_text = record.cover_letter_text,
        character_count   = len(record.cover_letter_text),
        tone_used         = parsed.get("tone_used", ""),
        key_connections   = parsed.get("key_connections", []),
        model_used        = record.model_used,
        latency_ms        = record.latency_ms or 0,
        created_at        = record.created_at,
    )


@router.get("/cover-letter/history")
@limiter.limit("30/minute")
async def cover_letter_history(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    rows = (
        db.query(CoverLetter)
        .filter(CoverLetter.user_id == uuid.UUID(ctx["user_id"]))
        .order_by(CoverLetter.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        CoverLetterHistoryItem(
            cover_letter_id = r.id,
            job_position    = r.job_position,
            company         = r.company,
            character_count = len(r.cover_letter_text),
            created_at      = r.created_at,
        )
        for r in rows
    ]


@router.get("/cover-letter/{cover_letter_id}")
@limiter.limit("60/minute")
async def cover_letter_get(
    request: Request,
    cover_letter_id: uuid.UUID,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    record = db.query(CoverLetter).filter(CoverLetter.id == cover_letter_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Cover letter not found")
    if str(record.user_id) != ctx["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    if record.raw_response:
        from services.ai_resume_service import safe_parse_json
        parsed, _ = safe_parse_json(record.raw_response)
    else:
        parsed = {}

    return CoverLetterResponse(
        cover_letter_id   = record.id,
        cover_letter_text = record.cover_letter_text,
        character_count   = len(record.cover_letter_text),
        tone_used         = parsed.get("tone_used", ""),
        key_connections   = parsed.get("key_connections", []),
        model_used        = record.model_used,
        latency_ms        = record.latency_ms or 0,
        created_at        = record.created_at,
    )


# ── Interview Prep: Question Sets ─────────────────────────────────────────────

@router.post("/interview-prep/questions", status_code=201)
@limiter.limit("5/minute")
async def interview_prep_generate_questions(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
    job_position:    str = Form(...),
    company:         str = Form(...),
    job_description: str = Form(...),
    num_questions:   int = Form(default=10),
    interview_stage: str = Form(default=""),
    resume: UploadFile = File(default=None),
):
    if not (5 <= num_questions <= 20):
        raise HTTPException(status_code=422, detail="num_questions must be between 5 and 20")

    file_bytes: bytes | None = None
    filename: str | None = None
    if resume is not None:
        file_bytes = await resume.read()
        filename   = resume.filename or "resume"

    try:
        record = await _create_question_set(
            job_position=job_position,
            company=company,
            job_description=job_description,
            num_questions=num_questions,
            interview_stage=interview_stage,
            user_id=uuid.UUID(ctx["user_id"]),
            db=db,
            file_bytes=file_bytes,
            filename=filename,
        )
    except ValueError as exc:
        error_map = {
            "WRONG_TYPE": "Only PDF and DOCX resume files are accepted.",
            "UNREADABLE": "We couldn't read your resume. Try re-saving it as a PDF.",
        }
        raise HTTPException(status_code=422, detail=error_map.get(str(exc), str(exc)))

    db.commit()
    db.refresh(record)

    return QuestionSetResponse(
        question_set_id      = record.id,
        job_position         = record.job_position,
        company              = record.company,
        interview_stage      = record.interview_stage,
        questions            = record.questions or [],
        closing_questions    = record.closing_questions or [],
        role_summary         = record.role_summary,
        interview_stage_note = record.interview_stage_note,
        key_themes           = record.key_themes or [],
        research_sources     = record.research_sources or [],
        model_used           = record.model_used,
        latency_ms           = record.latency_ms or 0,
        created_at           = record.created_at,
    )


@router.get("/interview-prep/questions/history")
@limiter.limit("30/minute")
async def interview_prep_questions_history(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    rows = (
        db.query(QuestionSet)
        .filter(QuestionSet.user_id == uuid.UUID(ctx["user_id"]))
        .order_by(QuestionSet.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        QuestionSetHistoryItem(
            question_set_id = r.id,
            job_position    = r.job_position,
            company         = r.company,
            num_questions   = r.num_questions,
            created_at      = r.created_at,
        )
        for r in rows
    ]


@router.get("/interview-prep/questions/{question_set_id}")
@limiter.limit("60/minute")
async def interview_prep_get_question_set(
    request: Request,
    question_set_id: uuid.UUID,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    record = db.query(QuestionSet).filter(QuestionSet.id == question_set_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Question set not found")
    if str(record.user_id) != ctx["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    return QuestionSetResponse(
        question_set_id      = record.id,
        job_position         = record.job_position,
        company              = record.company,
        interview_stage      = record.interview_stage,
        questions            = record.questions or [],
        closing_questions    = record.closing_questions or [],
        role_summary         = record.role_summary,
        interview_stage_note = record.interview_stage_note,
        key_themes           = record.key_themes or [],
        research_sources     = record.research_sources or [],
        model_used           = record.model_used,
        latency_ms           = record.latency_ms or 0,
        created_at           = record.created_at,
    )


# ── Interview Prep: Answer Evaluation ────────────────────────────────────────

@router.post("/interview-prep/answers", status_code=201)
@limiter.limit("10/minute")
async def interview_prep_submit_answer(
    request: Request,
    body: SubmitAnswerRequest,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    record = await _submit_and_evaluate_answer(
        question_set_id   = body.question_set_id,
        question_text     = body.question_text,
        question_category = body.question_category,
        target_skill      = body.target_skill,
        candidate_answer  = body.candidate_answer,
        job_position      = body.job_position,
        company           = body.company,
        user_id           = uuid.UUID(ctx["user_id"]),
        db                = db,
    )
    db.commit()
    db.refresh(record)

    return AnswerFeedbackResponse(
        answer_id       = record.id,
        question_text   = record.question_text,
        overall_score   = record.overall_score or 0,
        score_rationale = record.score_rationale or "",
        strongest_part  = record.strongest_part or "",
        critical_gap    = record.critical_gap or "",
        improved_answer = record.improved_answer or "",
        one_line_tip    = record.one_line_tip or "",
        share_breakdown = record.share_breakdown or {},
        model_used      = record.model_used,
        latency_ms      = record.latency_ms or 0,
        created_at      = record.created_at,
    )


@router.post("/interview-prep/generate-answer")
@limiter.limit("10/minute")
async def interview_prep_generate_answer(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    question_text:     str = Form(...),
    job_position:      str = Form(...),
    company:           str = Form(...),
    question_category: str = Form(default=""),
    target_skill:      str = Form(default=""),
    resume: UploadFile = File(default=None),
):
    file_bytes: bytes | None = None
    filename: str | None = None
    if resume is not None:
        file_bytes = await resume.read()
        filename   = resume.filename or "resume"

    result, latency_ms = await _generate_model_answer(
        question_text=question_text,
        question_category=question_category or None,
        target_skill=target_skill or None,
        job_position=job_position,
        company=company,
        file_bytes=file_bytes,
        filename=filename,
    )

    return GeneratedAnswerResponse(
        model_answer         = result.get("model_answer", ""),
        key_points           = result.get("key_points", []),
        personalization_note = result.get("personalization_note"),
        latency_ms           = latency_ms,
    )


@router.get("/interview-prep/answers/history")
@limiter.limit("30/minute")
async def interview_prep_answers_history(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    rows = (
        db.query(InterviewAnswer)
        .filter(InterviewAnswer.user_id == uuid.UUID(ctx["user_id"]))
        .order_by(InterviewAnswer.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        AnswerHistoryItem(
            answer_id     = r.id,
            question_text = r.question_text,
            overall_score = r.overall_score,
            job_position  = r.job_position,
            company       = r.company,
            created_at    = r.created_at,
        )
        for r in rows
    ]


# ── Interview Prep: Sessions ──────────────────────────────────────────────────

@router.post("/interview-prep/sessions", status_code=201)
@limiter.limit("10/minute")
async def interview_prep_create_session(
    request: Request,
    body: CreateSessionRequest,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    record = save_interview_session(
        db              = db,
        user_id         = uuid.UUID(ctx["user_id"]),
        question_set_id = body.question_set_id,
        job_position    = body.job_position,
        company         = body.company,
        questions_total = body.questions_total,
    )
    db.commit()
    db.refresh(record)

    return InterviewSessionResponse(
        session_id          = record.id,
        job_position        = record.job_position,
        company             = record.company,
        questions_total     = record.questions_total,
        questions_answered  = record.questions_answered,
        avg_score           = float(record.avg_score) if record.avg_score is not None else None,
        completed_at        = record.completed_at,
        created_at          = record.created_at,
    )


@router.patch("/interview-prep/sessions/{session_id}", status_code=200)
@limiter.limit("20/minute")
async def interview_prep_update_session(
    request: Request,
    session_id: uuid.UUID,
    body: UpdateSessionRequest,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    record = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(record.user_id) != ctx["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    record = _update_interview_session(
        db                 = db,
        session            = record,
        questions_answered = body.questions_answered,
        avg_score          = body.avg_score,
        completed          = body.completed,
    )
    db.commit()
    db.refresh(record)

    return InterviewSessionResponse(
        session_id          = record.id,
        job_position        = record.job_position,
        company             = record.company,
        questions_total     = record.questions_total,
        questions_answered  = record.questions_answered,
        avg_score           = float(record.avg_score) if record.avg_score is not None else None,
        completed_at        = record.completed_at,
        created_at          = record.created_at,
    )


@router.get("/interview-prep/sessions/history")
@limiter.limit("30/minute")
async def interview_prep_sessions_history(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    rows = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == uuid.UUID(ctx["user_id"]))
        .order_by(InterviewSession.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        SessionHistoryItem(
            session_id          = r.id,
            job_position        = r.job_position,
            company             = r.company,
            questions_total     = r.questions_total,
            questions_answered  = r.questions_answered,
            avg_score           = float(r.avg_score) if r.avg_score is not None else None,
            completed_at        = r.completed_at,
            created_at          = r.created_at,
        )
        for r in rows
    ]
