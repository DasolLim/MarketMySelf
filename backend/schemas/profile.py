from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID

EXPERIENCE_LEVELS = {"junior", "mid", "senior"}
JOB_CATEGORIES = {"Technical", "Marketing", "Finance"}


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    job_title: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=300)
    job_category: Optional[str] = None
    experience_level: Optional[str] = None
    tech_skills: Optional[list[str]] = None
    soft_skills: Optional[list[str]] = None
    is_published: Optional[bool] = None

    @field_validator("job_category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in JOB_CATEGORIES:
            raise ValueError(f"job_category must be one of {JOB_CATEGORIES}")
        return v

    @field_validator("experience_level")
    @classmethod
    def validate_experience(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in EXPERIENCE_LEVELS:
            raise ValueError(f"experience_level must be one of {EXPERIENCE_LEVELS}")
        return v

    @field_validator("tech_skills", "soft_skills")
    @classmethod
    def validate_skills(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is not None:
            if len(v) > 10:
                raise ValueError("Maximum 10 skills allowed")
            return [s.strip()[:50] for s in v if s.strip()]
        return v


class LinksUpdateRequest(BaseModel):
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    twitter: Optional[str] = None
    other: Optional[str] = None

    @field_validator("github", "linkedin", "portfolio", "twitter", "other")
    @classmethod
    def validate_https(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.startswith("https://"):
            raise ValueError("URLs must use https://")
        return v


class ProfileResponse(BaseModel):
    id: UUID
    page_number: int
    row: int
    col: int
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    bio: Optional[str] = None
    portfolio_url: Optional[str] = None
    job_category: Optional[str] = None
    skills: list[str] = []
    experience_level: Optional[str] = None
    tech_skills: list[str] = []
    soft_skills: list[str] = []
    resume_url: Optional[str] = None
    links: Optional[dict] = None
    image_url: Optional[str] = None
    is_published: bool
    purchased_at: Optional[datetime] = None
    updated_at: datetime

    model_config = {"from_attributes": True}
