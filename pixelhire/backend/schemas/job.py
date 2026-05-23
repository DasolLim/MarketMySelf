from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID

JOB_CATEGORIES = {"Technical", "Marketing", "Finance"}
EXPERIENCE_LEVELS = {"junior", "mid", "senior"}


class JobPostCreateRequest(BaseModel):
    title: str = Field(..., max_length=200)
    description: str = Field(..., max_length=5000)
    job_category: str
    required_tech_skills: list[str] = []
    required_soft_skills: list[str] = []
    experience_level: Optional[str] = None

    @field_validator("job_category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in JOB_CATEGORIES:
            raise ValueError(f"job_category must be one of {JOB_CATEGORIES}")
        return v

    @field_validator("experience_level")
    @classmethod
    def validate_experience(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in EXPERIENCE_LEVELS:
            raise ValueError(f"experience_level must be one of {EXPERIENCE_LEVELS}")
        return v


class JobPostUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    job_category: Optional[str] = None
    required_tech_skills: Optional[list[str]] = None
    required_soft_skills: Optional[list[str]] = None
    experience_level: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("job_category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in JOB_CATEGORIES:
            raise ValueError(f"job_category must be one of {JOB_CATEGORIES}")
        return v


class JobPostResponse(BaseModel):
    id: UUID
    recruiter_id: UUID
    title: str
    description: str
    job_category: str
    required_tech_skills: list[str] = []
    required_soft_skills: list[str] = []
    experience_level: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
