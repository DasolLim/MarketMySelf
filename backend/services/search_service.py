from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from models.section import PixelSection


class SearchFilters:
    def __init__(
        self,
        job_category: Optional[str] = None,
        experience_level: Optional[str] = None,
        tech_skills: Optional[list[str]] = None,
        soft_skills: Optional[list[str]] = None,
        keyword: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ):
        self.job_category = job_category
        self.experience_level = experience_level
        self.tech_skills = tech_skills or []
        self.soft_skills = soft_skills or []
        self.keyword = keyword
        self.page = max(1, page)
        self.limit = min(50, max(1, limit))


def filter_seekers(db: Session, filters: SearchFilters) -> list[PixelSection]:
    q = db.query(PixelSection).filter(
        PixelSection.is_published == True,
        PixelSection.owner_id.isnot(None),
    )

    if filters.job_category:
        q = q.filter(PixelSection.job_category == filters.job_category)

    if filters.experience_level:
        q = q.filter(PixelSection.experience_level == filters.experience_level)

    if filters.tech_skills:
        q = q.filter(PixelSection.tech_skills.overlap(filters.tech_skills))

    if filters.soft_skills:
        q = q.filter(PixelSection.soft_skills.overlap(filters.soft_skills))

    if filters.keyword:
        kw = f"%{filters.keyword}%"
        q = q.filter(
            or_(
                PixelSection.full_name.ilike(kw),
                PixelSection.job_title.ilike(kw),
                PixelSection.bio.ilike(kw),
            )
        )

    offset = (filters.page - 1) * filters.limit
    return q.order_by(PixelSection.updated_at.desc()).offset(offset).limit(filters.limit).all()
