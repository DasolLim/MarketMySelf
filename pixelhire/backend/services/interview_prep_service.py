from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models.interview_prep import InterviewAnswer, InterviewSession, QuestionSet
from services.ai_resume_service import (
    call_openrouter,
    compute_file_hash,
    extract_text_from_docx,
    extract_text_from_pdf,
    get_active_prompt,
    safe_parse_json,
)

logger = logging.getLogger(__name__)

FRONTIER_MODEL = os.environ.get("OPENROUTER_FRONTIER_MODEL", "anthropic/claude-sonnet-4")
CHEAP_MODEL    = os.environ.get("OPENROUTER_CHEAP_MODEL", "openai/gpt-4o-mini")


# ── Resume extraction (optional for question generation) ──────────────────────

def extract_resume_text(file_bytes: bytes, filename: str) -> tuple[str, str]:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("pdf", "docx"):
        raise ValueError("WRONG_TYPE")
    try:
        if ext == "pdf":
            text, _ = extract_text_from_pdf(file_bytes)
        else:
            text, _ = extract_text_from_docx(file_bytes)
    except Exception:
        raise ValueError("UNREADABLE")
    if len(text.split()) < 30:
        raise ValueError("UNREADABLE")
    return text, compute_file_hash(file_bytes)


# ── Parse resume for question context ────────────────────────────────────────

async def parse_resume_for_questions(resume_text: str, db: Session) -> dict:
    word_count = len(resume_text.split())
    max_tokens = 800 if word_count < 400 else (1200 if word_count <= 700 else 1500)
    try:
        prompt_template = get_active_prompt("parser", db)
        prompt = prompt_template.replace("{{resume_text}}", resume_text)
        raw, _, _, _ = await call_openrouter(prompt, CHEAP_MODEL, temperature=0.0, max_tokens=max_tokens)
        result, success = safe_parse_json(raw)
        if success and result:
            return result
    except Exception as exc:
        logger.warning("Resume parse failed for question generation: %s", exc)
    return {}


# ── Generate interview questions ──────────────────────────────────────────────

_WEB_SEARCH_TOOLS = [{"type": "web_search_20250305", "name": "web_search"}]


async def generate_question_set(
    job_position: str,
    company: str,
    job_description: str,
    num_questions: int,
    interview_stage: str,
    parsed_resume: dict,
    db: Session,
) -> tuple[dict, str, int, int, int]:
    prompt_template = get_active_prompt("interview_questions", db)
    resume_json = json.dumps(parsed_resume) if parsed_resume else "Not provided"
    stage_value = interview_stage.strip() or "Not specified"

    prompt = (
        prompt_template
        .replace("{{job_position}}", job_position)
        .replace("{{company}}", company)
        .replace("{{job_description}}", job_description)
        .replace("{{resume_json}}", resume_json)
        .replace("{{num_questions}}", str(num_questions))
        .replace("{{interview_stage}}", stage_value)
    )

    raw, tokens_input, tokens_output, latency_ms = await call_openrouter(
        prompt, FRONTIER_MODEL, temperature=0.3, max_tokens=3000,
        tools=_WEB_SEARCH_TOOLS,
    )
    result, _ = safe_parse_json(raw)
    return result, FRONTIER_MODEL, tokens_input, tokens_output, latency_ms


# ── Generate closing questions ────────────────────────────────────────────────

async def generate_closing_questions(
    job_position: str,
    company: str,
    job_description: str,
    db: Session,
) -> tuple[list[dict], int, int, int]:
    prompt_template = get_active_prompt("closing_questions", db)
    prompt = (
        prompt_template
        .replace("{{job_position}}", job_position)
        .replace("{{company}}", company)
        .replace("{{job_description}}", job_description)
    )

    raw, tokens_input, tokens_output, latency_ms = await call_openrouter(
        prompt, FRONTIER_MODEL, temperature=0.3, max_tokens=1500
    )
    result, _ = safe_parse_json(raw)
    questions = result.get("questions", []) if result else []
    return questions, tokens_input, tokens_output, latency_ms


# ── Evaluate an answer ────────────────────────────────────────────────────────

async def evaluate_answer(
    question_text: str,
    candidate_answer: str,
    job_position: str,
    company: str,
    db: Session,
) -> tuple[dict, str, int, int, int]:
    prompt_template = get_active_prompt("interview_answer", db)
    prompt = (
        prompt_template
        .replace("{{question}}", question_text)
        .replace("{{candidate_answer}}", candidate_answer)
        .replace("{{job_position}}", job_position)
        .replace("{{company}}", company)
    )

    raw, tokens_input, tokens_output, latency_ms = await call_openrouter(
        prompt, FRONTIER_MODEL, temperature=0.2, max_tokens=2000
    )
    result, _ = safe_parse_json(raw)
    return result or {}, FRONTIER_MODEL, tokens_input, tokens_output, latency_ms


# ── Persistence helpers ───────────────────────────────────────────────────────

def save_question_set(
    db: Session,
    user_id: uuid.UUID,
    job_position: str,
    company: str,
    job_description: str,
    interview_stage: str | None,
    resume_hash: str | None,
    questions: list,
    closing_questions: list,
    role_summary: str | None,
    interview_stage_note: str | None,
    key_themes: list,
    research_sources: list,
    num_questions: int,
    model_used: str,
    tokens_input: int,
    tokens_output: int,
    latency_ms: int,
) -> QuestionSet:
    record = QuestionSet(
        user_id              = user_id,
        job_position         = job_position,
        company              = company,
        job_description      = job_description,
        interview_stage      = interview_stage or None,
        resume_hash          = resume_hash,
        questions            = questions,
        closing_questions    = closing_questions,
        role_summary         = role_summary,
        interview_stage_note = interview_stage_note,
        key_themes           = key_themes,
        research_sources     = research_sources,
        num_questions        = num_questions,
        model_used           = model_used,
        tokens_input         = tokens_input,
        tokens_output        = tokens_output,
        latency_ms           = latency_ms,
    )
    db.add(record)
    db.flush()
    return record


def save_interview_answer(
    db: Session,
    user_id: uuid.UUID,
    question_set_id: uuid.UUID | None,
    question_text: str,
    question_category: str | None,
    target_skill: str | None,
    candidate_answer: str,
    job_position: str,
    company: str,
    result: dict,
    model_used: str,
    tokens_input: int,
    tokens_output: int,
    latency_ms: int,
) -> InterviewAnswer:
    record = InterviewAnswer(
        user_id           = user_id,
        question_set_id   = question_set_id,
        question_text     = question_text,
        question_category = question_category,
        target_skill      = target_skill,
        candidate_answer  = candidate_answer,
        job_position      = job_position,
        company           = company,
        share_breakdown   = result.get("share_breakdown"),
        overall_score     = result.get("overall_score"),
        score_rationale   = result.get("score_rationale"),
        strongest_part    = result.get("strongest_part"),
        critical_gap      = result.get("critical_gap"),
        improved_answer   = result.get("improved_answer"),
        one_line_tip      = result.get("one_line_tip"),
        model_used        = model_used,
        tokens_input      = tokens_input,
        tokens_output     = tokens_output,
        latency_ms        = latency_ms,
    )
    db.add(record)
    db.flush()
    return record


def save_interview_session(
    db: Session,
    user_id: uuid.UUID,
    question_set_id: uuid.UUID | None,
    job_position: str,
    company: str,
    questions_total: int,
) -> InterviewSession:
    record = InterviewSession(
        user_id         = user_id,
        question_set_id = question_set_id,
        job_position    = job_position,
        company         = company,
        questions_total = questions_total,
    )
    db.add(record)
    db.flush()
    return record


def update_interview_session(
    db: Session,
    session: InterviewSession,
    questions_answered: int | None = None,
    avg_score: float | None = None,
    completed: bool = False,
) -> InterviewSession:
    if questions_answered is not None:
        session.questions_answered = questions_answered
    if avg_score is not None:
        session.avg_score = avg_score
    if completed and session.completed_at is None:
        session.completed_at = datetime.now(timezone.utc)
    db.flush()
    return session


# ── Master orchestrators ──────────────────────────────────────────────────────

async def create_question_set(
    job_position: str,
    company: str,
    job_description: str,
    num_questions: int,
    interview_stage: str,
    user_id: uuid.UUID,
    db: Session,
    file_bytes: bytes | None = None,
    filename: str | None = None,
) -> QuestionSet:
    resume_hash: str | None = None
    parsed_resume: dict = {}

    if file_bytes and filename:
        resume_text, resume_hash = extract_resume_text(file_bytes, filename)
        parsed_resume = await parse_resume_for_questions(resume_text, db)

    result, model_used, tokens_input, tokens_output, latency_ms = await generate_question_set(
        job_position=job_position,
        company=company,
        job_description=job_description,
        num_questions=num_questions,
        interview_stage=interview_stage,
        parsed_resume=parsed_resume,
        db=db,
    )

    questions            = result.get("questions", [])
    role_summary         = result.get("role_summary")
    interview_stage_note = result.get("interview_stage_note")
    key_themes           = result.get("key_themes", [])
    research_sources     = result.get("research_sources", [])

    closing_qs, cl_in, cl_out, cl_lat = await generate_closing_questions(
        job_position=job_position,
        company=company,
        job_description=job_description,
        db=db,
    )

    total_tokens_input  = tokens_input + cl_in
    total_tokens_output = tokens_output + cl_out
    total_latency       = latency_ms + cl_lat

    return save_question_set(
        db=db,
        user_id=user_id,
        job_position=job_position,
        company=company,
        job_description=job_description,
        interview_stage=interview_stage,
        resume_hash=resume_hash,
        questions=questions,
        closing_questions=closing_qs,
        role_summary=role_summary,
        interview_stage_note=interview_stage_note,
        key_themes=key_themes,
        research_sources=research_sources,
        num_questions=num_questions,
        model_used=model_used,
        tokens_input=total_tokens_input,
        tokens_output=total_tokens_output,
        latency_ms=total_latency,
    )


async def generate_model_answer(
    question_text: str,
    question_category: str | None,
    target_skill: str | None,
    job_position: str,
    company: str,
    file_bytes: bytes | None = None,
    filename: str | None = None,
) -> tuple[dict, int]:
    resume_text: str | None = None
    if file_bytes and filename:
        try:
            text, _ = extract_resume_text(file_bytes, filename)
            resume_text = text
        except ValueError:
            pass

    has_resume = bool(resume_text and resume_text.strip())
    resume_section = f"\n\nCANDIDATE RESUME:\n{resume_text[:3000]}" if has_resume else ""

    if has_resume:
        instruction = (
            "Using the candidate's resume above, generate a PERSONALIZED model answer "
            "that directly references their actual experience, skills, and achievements. "
            "Include a personalization_note (1-2 sentences) explaining which resume details you used."
        )
        note_placeholder = '"Brief note explaining which resume details were used"'
    else:
        instruction = (
            "No resume was provided. Generate a strong model answer with clear placeholder "
            "details like [Your Achievement], [Company Name], [Specific Metric]. "
            "Show the structure and substance a strong candidate should deliver."
        )
        note_placeholder = "null"

    prompt = f"""You are an expert interview coach. Generate a model answer for the following interview question.

ROLE: {job_position} at {company}
QUESTION CATEGORY: {question_category or "behavioral"}
TARGET SKILL: {target_skill or "General"}
QUESTION: {question_text}{resume_section}

{instruction}

Respond with ONLY valid JSON in this exact format:
{{
  "model_answer": "Full 2-4 paragraph answer using the SHARE framework (Situation, Hindrance, Action, Result, Evaluation). Natural conversational tone, 150-250 words.",
  "key_points": ["3-5 specific elements this answer covers and why they strengthen it"],
  "personalization_note": {note_placeholder}
}}"""

    raw, _, _, latency_ms = await call_openrouter(
        prompt, FRONTIER_MODEL, temperature=0.4, max_tokens=1500
    )
    result, _ = safe_parse_json(raw)
    return result or {}, latency_ms


async def submit_and_evaluate_answer(
    question_set_id: uuid.UUID | None,
    question_text: str,
    question_category: str | None,
    target_skill: str | None,
    candidate_answer: str,
    job_position: str,
    company: str,
    user_id: uuid.UUID,
    db: Session,
) -> InterviewAnswer:
    result, model_used, tokens_input, tokens_output, latency_ms = await evaluate_answer(
        question_text=question_text,
        candidate_answer=candidate_answer,
        job_position=job_position,
        company=company,
        db=db,
    )

    return save_interview_answer(
        db=db,
        user_id=user_id,
        question_set_id=question_set_id,
        question_text=question_text,
        question_category=question_category,
        target_skill=target_skill,
        candidate_answer=candidate_answer,
        job_position=job_position,
        company=company,
        result=result,
        model_used=model_used,
        tokens_input=tokens_input,
        tokens_output=tokens_output,
        latency_ms=latency_ms,
    )
