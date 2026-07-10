from pydantic import BaseModel, HttpUrl, Field, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID

JOB_CATEGORIES = {"Technical", "Marketing", "Finance"}


EXPERIENCE_LEVELS = {"junior", "mid", "senior"}


class SectionUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    job_title: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=300)
    portfolio_url: Optional[str] = None
    job_category: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_level: Optional[str] = None
    tech_skills: Optional[List[str]] = None
    soft_skills: Optional[List[str]] = None
    links: Optional[dict] = None
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

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            if len(v) > 5:
                raise ValueError("Maximum 5 skills allowed")
            return [s.strip()[:50] for s in v if s.strip()]
        return v

    @field_validator("tech_skills", "soft_skills")
    @classmethod
    def validate_extended_skills(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            if len(v) > 10:
                raise ValueError("Maximum 10 skills allowed")
            return [s.strip()[:50] for s in v if s.strip()]
        return v

    @field_validator("portfolio_url")
    @classmethod
    def validate_https(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.startswith("https://"):
            raise ValueError("portfolio_url must use https://")
        return v


class SectionResponse(BaseModel):
    id: UUID
    page_number: int
    row: int
    col: int
    owner_id: Optional[UUID] = None
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    bio: Optional[str] = None
    portfolio_url: Optional[str] = None
    job_category: Optional[str] = None
    skills: List[str] = []
    experience_level: Optional[str] = None
    tech_skills: List[str] = []
    soft_skills: List[str] = []
    resume_url: Optional[str] = None
    links: Optional[dict] = None
    image_url: Optional[str] = None
    is_published: bool
    purchased_at: Optional[datetime] = None
    price_paid: Optional[float] = None
    updated_at: datetime

    model_config = {"from_attributes": True}
