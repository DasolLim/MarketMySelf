import io
import uuid
import magic
from PIL import Image, UnidentifiedImageError
from fastapi import UploadFile, HTTPException

MAX_BYTES = 500_000
MAX_DIM = 400
ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp"}


async def process_and_validate_image(file: UploadFile) -> tuple[bytes, str]:
    raw = await file.read()

    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=422, detail="Image exceeds 500 KB limit")

    mime = magic.from_buffer(raw, mime=True)
    if mime not in ALLOWED_MIMES:
        raise HTTPException(status_code=422, detail=f"Unsupported image type: {mime}")

    try:
        img = Image.open(io.BytesIO(raw))
        img.verify()
    except (UnidentifiedImageError, Exception):
        raise HTTPException(status_code=422, detail="Corrupt or invalid image file")

    img = Image.open(io.BytesIO(raw)).convert("RGBA")
    img.thumbnail((MAX_DIM, MAX_DIM), Image.LANCZOS)

    background = Image.new("RGBA", img.size, (255, 255, 255, 255))
    background.paste(img, mask=img.split()[3])
    img = background.convert("RGB")

    output = io.BytesIO()
    img.save(output, format="WEBP", quality=85, method=6)
    webp_bytes = output.getvalue()

    return webp_bytes, f"{uuid.uuid4()}.webp"
