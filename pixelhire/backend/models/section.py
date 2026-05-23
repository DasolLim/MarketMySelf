import uuid
from sqlalchemy import Column, String, SmallInteger, Integer, Numeric, Boolean, DateTime, Text, ARRAY, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from models.base import Base


class PixelSection(Base):
    __tablename__ = "pixel_sections"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    page_number = Column(SmallInteger, nullable=False)
    row = Column(SmallInteger, nullable=False)
    col = Column(SmallInteger, nullable=False)

    owner_id = Column(UUID(as_uuid=True), nullable=True)
    purchased_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    price_paid = Column(Numeric(10, 2), nullable=True)

    full_name = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    bio = Column(String(300), nullable=True)
    portfolio_url = Column(String, nullable=True)
    job_category = Column(String, nullable=True)
    skills = Column(ARRAY(Text), default=[])
    experience_level = Column(String, nullable=True)
    tech_skills = Column(ARRAY(Text), default=[])
    soft_skills = Column(ARRAY(Text), default=[])
    resume_path = Column(String, nullable=True)
    resume_url = Column(String, nullable=True)
    links = Column(JSONB, nullable=True)

    image_path = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    image_size_bytes = Column(Integer, nullable=True)
    image_uploaded_at = Column(DateTime(timezone=True), nullable=True)

    nft_token_id = Column(String, nullable=True)
    nft_contract_addr = Column(String, nullable=True)

    is_published = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
