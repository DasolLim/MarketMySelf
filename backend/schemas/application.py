from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID

APPLICATION_STATUSES = {"applied", "viewed", "shortlisted", "rejected"}


class ApplicationStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in APPLICATION_STATUSES:
            raise ValueError(f"status must be one of {APPLICATION_STATUSES}")
        return v


class ApplicationResponse(BaseModel):
    id: UUID
    seeker_id: UUID
    job_post_id: UUID
    status: str
    notification_sent: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    subject: str
    body: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
