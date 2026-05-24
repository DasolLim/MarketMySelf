from __future__ import annotations

import hashlib
import io
import json
import logging
import os
import uuid

from sqlalchemy.orm import Session

from models.cover_letter import CoverLetter
from services.ai_resume_service import (
    call_openrouter,
    get_active_prompt,
    safe_parse_json,
)

logger = logging.getLogger(__name__)

FRONTIER_MODEL = os.environ.get("OPENROUTER_FRONTIER_MODEL", "anthropic/claude-sonnet-4")
CHEAP_MODEL    = os.environ.get("OPENROUTER_CHEAP_MODEL", "openai/gpt-4o-mini")


# ── File extraction ───────────────────────────────────────────────────────────

def extract_and_validate_resume(
    file_bytes: bytes,
    filename: str,
) -> tuple[str, str]:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("pdf", "docx"):
        raise ValueError("WRONG_TYPE")

    try:
        if ext == "pdf":
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages).strip()
        else:
            from docx import Document
            doc = Document(io.BytesIO(file_bytes))
            text = "\n".join(para.text for para in doc.paragraphs).strip()
    except Exception:
        raise ValueError("UNREADABLE")

    if len(text.split()) < 50:
        raise ValueError("UNREADABLE")

    file_hash = hashlib.sha256(file_bytes).hexdigest()
    return text, file_hash


# ── Resume parsing ────────────────────────────────────────────────────────────

async def parse_resume_for_cover_letter(
    resume_text: str,
    db: Session,
) -> dict:
    word_count = len(resume_text.split())
    if word_count < 400:
        max_tokens = 800
    elif word_count <= 700:
        max_tokens = 1200
    else:
        max_tokens = 1500

    try:
        prompt_template = get_active_prompt("parser", db)
        prompt = prompt_template.replace("{{resume_text}}", resume_text)
        raw, _, _, _ = await call_openrouter(prompt, CHEAP_MODEL, temperature=0.0, max_tokens=max_tokens)
        result, success = safe_parse_json(raw)
        if success and result:
            result.setdefault("word_count", word_count)
            return result
    except Exception as exc:
        logger.warning("Resume parse failed for cover letter: %s", exc)

    return {"word_count": word_count}


# ── Cover letter LLM call ─────────────────────────────────────────────────────

async def generate_cover_letter_text(
    job_position: str,
    company: str,
    job_description: str,
    writing_style: str,
    max_characters: int,
    parsed_resume: dict,
    db: Session,
) -> tuple[str, dict, bool, str, int, int, int]:
    prompt_template = get_active_prompt("cover_letter", db)
    resume_json = json.dumps(parsed_resume) if parsed_resume else "Not provided"

    prompt = (
        prompt_template
        .replace("{{job_position}}", job_position)
        .replace("{{company}}", company)
        .replace("{{job_description}}", job_description)
        .replace("{{writing_style}}", writing_style)
        .replace("{{max_characters}}", str(max_characters))
        .replace("{{resume_json}}", resume_json)
    )

    raw, tokens_input, tokens_output, latency_ms = await call_openrouter(
        prompt, FRONTIER_MODEL, temperature=0.4, max_tokens=2000
    )
    parsed_result, parse_success = safe_parse_json(raw)
    return FRONTIER_MODEL, parsed_result, parse_success, raw, tokens_input, tokens_output, latency_ms


# ── Persistence ───────────────────────────────────────────────────────────────

def save_cover_letter(
    db: Session,
    user_id: uuid.UUID,
    job_position: str,
    company: str,
    job_description: str,
    writing_style: str,
    max_characters: int,
    resume_hash: str | None,
    parsed_resume: dict | None,
    cover_letter_text: str,
    model_used: str,
    raw_response: str,
    parse_success: bool,
    tokens_input: int,
    tokens_output: int,
    latency_ms: int,
) -> CoverLetter:
    record = CoverLetter(
        user_id           = user_id,
        job_position      = job_position,
        company           = company,
        job_description   = job_description,
        output_format     = "text",
        writing_style     = writing_style,
        max_characters    = max_characters,
        resume_hash       = resume_hash,
        parsed_resume     = parsed_resume,
        cover_letter_text = cover_letter_text,
        model_used        = model_used,
        raw_response      = raw_response,
        parse_success     = parse_success,
        tokens_input      = tokens_input,
        tokens_output     = tokens_output,
        latency_ms        = latency_ms,
    )
    db.add(record)
    db.flush()
    return record


# ── Truncate at sentence boundary ─────────────────────────────────────────────

def _truncate_at_sentence(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    for punct in (".", "!", "?"):
        pos = text.rfind(punct, 0, limit)
        if pos != -1:
            return text[: pos + 1].rstrip()
    return text[:limit].rstrip()


# ── Master orchestrator ───────────────────────────────────────────────────────

async def generate_cover_letter(
    job_position: str,
    company: str,
    job_description: str,
    writing_style: str,
    max_characters: int,
    file_bytes: bytes,
    filename: str,
    user_id: uuid.UUID,
    db: Session,
) -> CoverLetter:
    resume_text, resume_hash = extract_and_validate_resume(file_bytes, filename)
    parsed_resume = await parse_resume_for_cover_letter(resume_text, db)

    model_used, result, parse_success, raw_response, tokens_input, tokens_output, latency_ms = (
        await generate_cover_letter_text(
            job_position=job_position,
            company=company,
            job_description=job_description,
            writing_style=writing_style,
            max_characters=max_characters,
            parsed_resume=parsed_resume,
            db=db,
        )
    )

    cover_letter_text = result.get("cover_letter_text", "")
    if not isinstance(cover_letter_text, str):
        cover_letter_text = str(cover_letter_text)
    cover_letter_text = _truncate_at_sentence(cover_letter_text, max_characters)

    return save_cover_letter(
        db=db,
        user_id=user_id,
        job_position=job_position,
        company=company,
        job_description=job_description,
        writing_style=writing_style,
        max_characters=max_characters,
        resume_hash=resume_hash,
        parsed_resume=parsed_resume or None,
        cover_letter_text=cover_letter_text,
        model_used=model_used,
        raw_response=raw_response,
        parse_success=parse_success,
        tokens_input=tokens_input,
        tokens_output=tokens_output,
        latency_ms=latency_ms,
    )
