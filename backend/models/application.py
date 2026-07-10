import uuid
from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from models.base import Base


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seeker_id = Column(UUID(as_uuid=True), nullable=False)
    job_post_id = Column(UUID(as_uuid=True), nullable=False)
    status = Column(String, nullable=False, default="applied")
    notification_sent = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
