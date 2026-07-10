from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field
import uuid
from datetime import datetime

FeatureType = Literal["diagnoser", "recruiter", "rewriter", "hiring_manager"]


class ResumeAnalysisRequest(BaseModel):
    job_position:     str = Field(..., min_length=1, max_length=200)
    company:          str = Field(..., min_length=1, max_length=200)
    job_description:  str = Field(..., min_length=50, max_length=20000)
    feature:          FeatureType
    missing_keywords: list[str] = Field(default_factory=list)


class ValidationResult(BaseModel):
    is_valid:      bool
    error_code:    str | None = None
    error_message: str | None = None
    detected_as:   str | None = None


class ParsedResume(BaseModel):
    candidate_name:     str | None
    contact:            dict[str, str | None]
    summary:            str | None
    experience:         list[dict[str, Any]]
    education:          list[dict[str, Any]]
    skills:             list[str]
    certifications:     list[str]
    word_count:         int
    inferred_seniority: Literal["junior", "mid", "senior", "lead"]


class ResumeAnalysisResponse(BaseModel):
    analysis_id: uuid.UUID
    feature:     FeatureType
    result:      dict[str, Any]
    model_used:  str
    latency_ms:  int
    created_at:  datetime

    model_config = {"from_attributes": True}


class ResumeAnalysisHistoryItem(BaseModel):
    analysis_id:  uuid.UUID
    feature:      FeatureType
    job_position: str
    company:      str
    created_at:   datetime

    model_config = {"from_attributes": True}
