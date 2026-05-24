from __future__ import annotations

from datetime import datetime
import uuid

from pydantic import BaseModel, Field

DEFAULT_WRITING_STYLE = (
    "Professional and confident. Direct sentences. No filler words. "
    "Concrete and specific — every claim backed by evidence. "
    "Tone: assured but not arrogant. Reading level: senior professional."
)


class CoverLetterResponse(BaseModel):
    cover_letter_id:   uuid.UUID
    cover_letter_text: str
    character_count:   int
    tone_used:         str
    key_connections:   list[str]
    model_used:        str
    latency_ms:        int
    created_at:        datetime

    model_config = {"from_attributes": True}


class CoverLetterHistoryItem(BaseModel):
    cover_letter_id: uuid.UUID
    job_position:    str
    company:         str
    character_count: int
    created_at:      datetime

    model_config = {"from_attributes": True}


class DefaultWritingStyleResponse(BaseModel):
    writing_style: str
