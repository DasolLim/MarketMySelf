import uuid
from sqlalchemy import Column, Text, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from models.base import Base


class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id         = Column(UUID(as_uuid=True), ForeignKey("public.users.id", ondelete="CASCADE"), nullable=False)
    feature         = Column(Text, nullable=False)
    job_position    = Column(Text, nullable=False)
    company         = Column(Text, nullable=False)
    job_description = Column(Text, nullable=False)
    resume_version  = Column(Integer, nullable=False, default=1)
    resume_hash     = Column(Text, nullable=False)
    parsed_resume   = Column(JSONB)
    prompt_version  = Column(Text, nullable=False, default="v1.0")
    model_used      = Column(Text, nullable=False)
    raw_response    = Column(Text)
    parsed_response = Column(JSONB)
    parse_success   = Column(Boolean, nullable=False, default=True)
    tokens_input    = Column(Integer)
    tokens_output   = Column(Integer)
    latency_ms      = Column(Integer)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
