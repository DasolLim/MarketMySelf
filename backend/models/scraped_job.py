from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import ARRAY
from models.base import Base


class ScrapedJob(Base):
    __tablename__ = "scraped_jobs"
    __table_args__ = {"schema": "public"}

    id               = Column(Text, primary_key=True)
    source           = Column(Text, nullable=False)
    source_id        = Column(Text)
    source_url       = Column(Text, nullable=False)
    title            = Column(Text, nullable=False)
    company          = Column(Text, nullable=False)
    company_id       = Column(Text)
    location_city    = Column(Text)
    location_country = Column(Text, nullable=False, default="US")
    remote_raw       = Column(Text)
    work_type        = Column(Text)
    employment_type  = Column(Text)
    experience_level = Column(Text)
    category         = Column(Text)
    description      = Column(Text)
    description_text = Column(Text)
    skills           = Column(ARRAY(Text))
    salary_min       = Column(Integer)
    salary_max       = Column(Integer)
    salary_raw       = Column(Text)
    posted_at        = Column(DateTime(timezone=True))
    scraped_at       = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at       = Column(DateTime(timezone=True), nullable=False)
    is_active        = Column(Boolean, nullable=False, default=True)
