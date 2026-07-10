from typing import Annotated
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
from middleware.rate_limit import limiter
from models.section import PixelSection
from routers.auth import get_current_user_id
from services.image_processor import process_and_validate_image
from services.storage import delete_profile_image, upload_profile_image

router = APIRouter(prefix="/sections", tags=["images"])


@router.post("/{section_id}/image")
@limiter.limit("10/minute")
async def upload_section_image(
    request: Request,
    section_id: UUID,
    file: Annotated[UploadFile, File(...)],
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Session = Depends(get_db),
):
    section = db.query(PixelSection).filter(PixelSection.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    if str(section.owner_id) != user_id:
        raise HTTPException(status_code=403, detail="Not your section")

    webp_bytes, filename = await process_and_validate_image(file)

    if section.image_path:
        try:
            delete_profile_image(section.image_path)
        except Exception:
            pass

    section.image_path = f"sections/{section_id}/{filename}"
    section.image_url = upload_profile_image(str(section_id), filename, webp_bytes)
    section.image_size_bytes = len(webp_bytes)
    section.image_uploaded_at = datetime.now(timezone.utc)

    db.commit()
    return {"image_url": section.image_url, "size_bytes": len(webp_bytes)}
