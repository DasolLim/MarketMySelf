import uuid
from sqlalchemy import Column, Text, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from models.base import Base


class CoverLetter(Base):
    __tablename__ = "cover_letters"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id           = Column(UUID(as_uuid=True), ForeignKey("public.users.id", ondelete="CASCADE"), nullable=False)
    job_position      = Column(Text, nullable=False)
    company           = Column(Text, nullable=False)
    job_description   = Column(Text, nullable=False)
    output_format     = Column(Text, nullable=False)
    writing_style     = Column(Text)
    max_characters    = Column(Integer, nullable=False, default=1500)
    resume_hash       = Column(Text)
    parsed_resume     = Column(JSONB)
    cover_letter_text = Column(Text, nullable=False)
    prompt_version    = Column(Text, nullable=False, default="v1.0")
    model_used        = Column(Text, nullable=False)
    raw_response      = Column(Text)
    parse_success     = Column(Boolean, nullable=False, default=True)
    tokens_input      = Column(Integer)
    tokens_output     = Column(Integer)
    latency_ms        = Column(Integer)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
