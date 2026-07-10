import uuid
from sqlalchemy import Column, Text, Integer, Boolean, ForeignKey, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from models.base import Base


class QuestionSet(Base):
    __tablename__ = "question_sets"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id           = Column(UUID(as_uuid=True), ForeignKey("public.users.id", ondelete="CASCADE"), nullable=False)
    job_position      = Column(Text, nullable=False)
    company           = Column(Text, nullable=False)
    job_description   = Column(Text, nullable=False)
    resume_hash       = Column(Text)
    interview_stage      = Column(Text)
    questions            = Column(JSONB, nullable=False, default=list)
    closing_questions    = Column(JSONB, nullable=False, default=list)
    role_summary         = Column(Text)
    interview_stage_note = Column(Text)
    key_themes           = Column(JSONB, nullable=False, default=list)
    research_sources     = Column(JSONB, nullable=False, default=list)
    num_questions     = Column(Integer, nullable=False, default=10)
    model_used        = Column(Text, nullable=False)
    prompt_version    = Column(Text, nullable=False, default="v1.0")
    tokens_input      = Column(Integer)
    tokens_output     = Column(Integer)
    latency_ms        = Column(Integer)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id           = Column(UUID(as_uuid=True), ForeignKey("public.users.id", ondelete="CASCADE"), nullable=False)
    question_set_id   = Column(UUID(as_uuid=True), ForeignKey("public.question_sets.id", ondelete="SET NULL"), nullable=True)
    question_text     = Column(Text, nullable=False)
    question_category = Column(Text)
    target_skill      = Column(Text)
    candidate_answer  = Column(Text, nullable=False)
    job_position      = Column(Text, nullable=False)
    company           = Column(Text, nullable=False)
    share_breakdown   = Column(JSONB)
    overall_score     = Column(Integer)
    score_rationale   = Column(Text)
    strongest_part    = Column(Text)
    critical_gap      = Column(Text)
    improved_answer   = Column(Text)
    one_line_tip      = Column(Text)
    model_used        = Column(Text, nullable=False)
    prompt_version    = Column(Text, nullable=False, default="v1.0")
    tokens_input      = Column(Integer)
    tokens_output     = Column(Integer)
    latency_ms        = Column(Integer)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id             = Column(UUID(as_uuid=True), ForeignKey("public.users.id", ondelete="CASCADE"), nullable=False)
    question_set_id     = Column(UUID(as_uuid=True), ForeignKey("public.question_sets.id", ondelete="SET NULL"), nullable=True)
    job_position        = Column(Text, nullable=False)
    company             = Column(Text, nullable=False)
    questions_total     = Column(Integer, nullable=False, default=0)
    questions_answered  = Column(Integer, nullable=False, default=0)
    avg_score           = Column(Numeric(5, 2))
    completed_at        = Column(DateTime(timezone=True))
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
