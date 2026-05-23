import uuid
from sqlalchemy import Column, Text, Boolean, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from models.base import Base


class PromptTemplate(Base):
    __tablename__ = "prompt_templates"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    feature     = Column(Text, nullable=False)
    version     = Column(Text, nullable=False, default="v1.0")
    is_active   = Column(Boolean, nullable=False, default=True)
    prompt_text = Column(Text, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("feature", "version"),)
