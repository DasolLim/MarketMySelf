from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class NotifyRequest(BaseModel):
    user_id: UUID
    message: str


class SearchResultItem(BaseModel):
    id: UUID
    page_number: int
    row: int
    col: int
    owner_id: Optional[UUID] = None
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    bio: Optional[str] = None
    job_category: Optional[str] = None
    experience_level: Optional[str] = None
    tech_skills: list[str] = []
    soft_skills: list[str] = []
    image_url: Optional[str] = None
    is_published: bool

    model_config = {"from_attributes": True}
