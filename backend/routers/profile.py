from typing import Annotated
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
from middleware.rate_limit import limiter
from middleware.role_guard import require_role
from models.section import PixelSection
from schemas.profile import ProfileUpdateRequest, LinksUpdateRequest, ProfileResponse
from services.image_processor import process_and_validate_image
from services.storage import delete_profile_image, upload_profile_image, upload_resume

router = APIRouter(prefix="/profile", tags=["profile"])


def _get_seeker_section(db: Session, user_id: str) -> PixelSection:
    section = db.query(PixelSection).filter(PixelSection.owner_id == user_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="No section owned by this user")
    return section


@router.get("/me", response_model=ProfileResponse)
@limiter.limit("60/minute")
async def get_profile(
    request: Request,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    return _get_seeker_section(db, ctx["user_id"])


@router.patch("/me", response_model=ProfileResponse)
@limiter.limit("30/minute")
async def update_profile(
    request: Request,
    body: ProfileUpdateRequest,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    section = _get_seeker_section(db, ctx["user_id"])
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(section, field, value)
    db.commit()
    db.refresh(section)
    return section


@router.post("/me/image")
@limiter.limit("10/minute")
async def upload_profile_picture(
    request: Request,
    file: Annotated[UploadFile, File(...)],
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    section = _get_seeker_section(db, ctx["user_id"])
    webp_bytes, filename = await process_and_validate_image(file)

    if section.image_path:
        try:
            delete_profile_image(section.image_path)
        except Exception:
            pass

    section.image_path = f"sections/{section.id}/{filename}"
    section.image_url = upload_profile_image(str(section.id), filename, webp_bytes)
    section.image_size_bytes = len(webp_bytes)
    section.image_uploaded_at = datetime.now(timezone.utc)
    db.commit()
    return {"image_url": section.image_url, "size_bytes": len(webp_bytes)}


@router.post("/me/resume")
@limiter.limit("10/minute")
async def upload_resume_file(
    request: Request,
    file: Annotated[UploadFile, File(...)],
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    if file.content_type not in ("application/pdf",):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    section = _get_seeker_section(db, ctx["user_id"])
    filename = f"resume_{ctx['user_id'][:8]}.pdf"
    path, url = upload_resume(ctx["user_id"], filename, data)
    section.resume_path = path
    section.resume_url = url
    db.commit()
    return {"resume_url": url}


@router.patch("/me/links", response_model=ProfileResponse)
@limiter.limit("30/minute")
async def update_links(
    request: Request,
    body: LinksUpdateRequest,
    ctx: Annotated[dict, Depends(require_role("seeker"))],
    db: Session = Depends(get_db),
):
    section = _get_seeker_section(db, ctx["user_id"])
    existing_links = section.links or {}
    updated = {**existing_links, **body.model_dump(exclude_none=True)}
    section.links = updated
    db.commit()
    db.refresh(section)
    return section
