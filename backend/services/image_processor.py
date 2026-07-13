import io
import uuid
from PIL import Image, UnidentifiedImageError
from fastapi import UploadFile, HTTPException

MAX_BYTES = 500_000
MAX_DIM = 400
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


async def process_and_validate_image(file: UploadFile) -> tuple[bytes, str]:
    raw = await file.read()

    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=422, detail="Image exceeds 500 KB limit")

    try:
        probe = Image.open(io.BytesIO(raw))
        image_format = probe.format
        probe.verify()
    except (UnidentifiedImageError, Exception):
        raise HTTPException(status_code=422, detail="Corrupt or invalid image file")

    if image_format not in ALLOWED_FORMATS:
        raise HTTPException(status_code=422, detail=f"Unsupported image type: {image_format}")

    img = Image.open(io.BytesIO(raw)).convert("RGBA")
    img.thumbnail((MAX_DIM, MAX_DIM), Image.LANCZOS)

    background = Image.new("RGBA", img.size, (255, 255, 255, 255))
    background.paste(img, mask=img.split()[3])
    img = background.convert("RGB")

    output = io.BytesIO()
    img.save(output, format="WEBP", quality=85, method=6)
    webp_bytes = output.getvalue()

    return webp_bytes, f"{uuid.uuid4()}.webp"
