import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from models.base import Base


class JobPost(Base):
    __tablename__ = "job_posts"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recruiter_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    job_category = Column(String, nullable=False)
    required_tech_skills = Column(ARRAY(Text), default=[])
    required_soft_skills = Column(ARRAY(Text), default=[])
    experience_level = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
