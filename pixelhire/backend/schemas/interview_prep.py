from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


# ── Question types ────────────────────────────────────────────────────────────

QuestionCategory = Literal["behavioral", "situational", "competency", "culture_fit"]
Difficulty       = Literal["warm_up", "core", "challenge"]
ClosingCategory  = Literal["role_clarity", "team_culture", "growth_impact", "process_tooling"]
ShareQuality     = Literal["weak", "adequate", "strong"]


class InterviewQuestion(BaseModel):
    id:            int
    question:      str
    category:      QuestionCategory
    target_skill:  str
    difficulty:    Difficulty
    hint:          str


class ClosingQuestion(BaseModel):
    question:  str
    category:  ClosingCategory
    why_ask:   str


# ── Question set ──────────────────────────────────────────────────────────────

class GenerateQuestionsRequest(BaseModel):
    job_position:    str = Field(..., min_length=1, max_length=200)
    company:         str = Field(..., min_length=1, max_length=200)
    job_description: str = Field(..., min_length=50, max_length=20000)
    num_questions:   int = Field(default=10, ge=5, le=20)
    interview_stage: str = Field(default="", max_length=100)


class QuestionSetResponse(BaseModel):
    question_set_id:     uuid.UUID
    job_position:        str
    company:             str
    interview_stage:     str | None
    questions:           list[dict[str, Any]]
    closing_questions:   list[dict[str, Any]]
    role_summary:        str | None
    interview_stage_note: str | None
    key_themes:          list[str]
    research_sources:    list[str]
    model_used:          str
    latency_ms:          int
    created_at:          datetime

    model_config = {"from_attributes": True}


class QuestionSetHistoryItem(BaseModel):
    question_set_id: uuid.UUID
    job_position:    str
    company:         str
    num_questions:   int
    created_at:      datetime

    model_config = {"from_attributes": True}


# ── Answer evaluation ─────────────────────────────────────────────────────────

class ShareComponentDetail(BaseModel):
    present:  bool
    quality:  ShareQuality
    feedback: str


class ShareBreakdown(BaseModel):
    situation:  ShareComponentDetail
    hindrance:  ShareComponentDetail
    action:     ShareComponentDetail
    result:     ShareComponentDetail
    evaluation: ShareComponentDetail


class SubmitAnswerRequest(BaseModel):
    question_set_id:   uuid.UUID | None = None
    question_text:     str = Field(..., min_length=10, max_length=1000)
    question_category: QuestionCategory | None = None
    target_skill:      str | None = None
    candidate_answer:  str = Field(..., min_length=10, max_length=5000)
    job_position:      str = Field(..., min_length=1, max_length=200)
    company:           str = Field(..., min_length=1, max_length=200)


class AnswerFeedbackResponse(BaseModel):
    answer_id:       uuid.UUID
    question_text:   str
    overall_score:   int
    score_rationale: str
    strongest_part:  str
    critical_gap:    str
    improved_answer: str
    one_line_tip:    str
    share_breakdown: dict[str, Any]
    model_used:      str
    latency_ms:      int
    created_at:      datetime

    model_config = {"from_attributes": True}


class AnswerHistoryItem(BaseModel):
    answer_id:      uuid.UUID
    question_text:  str
    overall_score:  int | None
    job_position:   str
    company:        str
    created_at:     datetime

    model_config = {"from_attributes": True}


# ── Interview session ─────────────────────────────────────────────────────────

class CreateSessionRequest(BaseModel):
    question_set_id: uuid.UUID | None = None
    job_position:    str = Field(..., min_length=1, max_length=200)
    company:         str = Field(..., min_length=1, max_length=200)
    questions_total: int = Field(default=0, ge=0)


class UpdateSessionRequest(BaseModel):
    questions_answered: int | None = None
    avg_score:          float | None = None
    completed:          bool = False


class InterviewSessionResponse(BaseModel):
    session_id:         uuid.UUID
    job_position:       str
    company:            str
    questions_total:    int
    questions_answered: int
    avg_score:          float | None
    completed_at:       datetime | None
    created_at:         datetime

    model_config = {"from_attributes": True}


class SessionHistoryItem(BaseModel):
    session_id:         uuid.UUID
    job_position:       str
    company:            str
    questions_total:    int
    questions_answered: int
    avg_score:          float | None
    completed_at:       datetime | None
    created_at:         datetime

    model_config = {"from_attributes": True}


# ── Generate model answer ─────────────────────────────────────────────────────

class GeneratedAnswerResponse(BaseModel):
    model_answer:         str
    key_points:           list[str]
    personalization_note: str | None
    latency_ms:           int
