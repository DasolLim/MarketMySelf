from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from middleware.rate_limit import limiter
from models.section import PixelSection
from routers.auth import get_current_user_id
from schemas.section import GridSectionResponse, SectionResponse, SectionUpdateRequest

router = APIRouter(prefix="/sections", tags=["sections"])


@router.get("/page/{page_number}", response_model=List[GridSectionResponse])
@limiter.limit("60/minute")
async def get_page_sections(request: Request, page_number: int, db: Session = Depends(get_db)):
    if page_number not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="page_number must be 1, 2, or 3")
    return db.query(PixelSection).filter(PixelSection.page_number == page_number).all()


@router.get("/{section_id}", response_model=SectionResponse)
@limiter.limit("120/minute")
async def get_section(request: Request, section_id: UUID, db: Session = Depends(get_db)):
    section = db.query(PixelSection).filter(PixelSection.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    return section


@router.patch("/{section_id}", response_model=SectionResponse)
@limiter.limit("30/minute")
async def update_section(
    request: Request,
    section_id: UUID,
    body: SectionUpdateRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    section = db.query(PixelSection).filter(PixelSection.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    if str(section.owner_id) != user_id:
        raise HTTPException(status_code=403, detail="Not your section")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(section, field, value)

    db.commit()
    db.refresh(section)
    return section
