from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import time
import uuid
from typing import TYPE_CHECKING

import httpx
from sqlalchemy.orm import Session

from models.prompt_template import PromptTemplate
from models.resume_analysis import ResumeAnalysis
from schemas.resume_analysis import FeatureType, ValidationResult

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_API_KEY  = os.environ.get("OPENROUTER_API_KEY", "")
FRONTIER_MODEL      = os.environ.get("OPENROUTER_FRONTIER_MODEL", "anthropic/claude-sonnet-4")
CHEAP_MODEL         = os.environ.get("OPENROUTER_CHEAP_MODEL", "openai/gpt-4o-mini")


# ── File extraction ───────────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, int]:
    import pdfplumber
    import io
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        page_count = len(pdf.pages)
        text = "\n".join(
            page.extract_text() or "" for page in pdf.pages
        ).strip()
    if not text:
        raise ValueError("No text extracted from PDF")
    return text, page_count


def extract_text_from_docx(file_bytes: bytes) -> tuple[str, int]:
    from docx import Document
    import io
    doc = Document(io.BytesIO(file_bytes))
    text = "\n".join(para.text for para in doc.paragraphs).strip()
    if not text:
        raise ValueError("No text extracted from DOCX")
    word_count = len(text.split())
    page_count = math.ceil(word_count / 500)
    return text, page_count


def compute_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


# ── Structural validator ──────────────────────────────────────────────────────

def validate_structure(
    file_bytes: bytes,
    filename: str,
) -> tuple[str, int, str | None]:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("pdf", "docx"):
        return "", 0, "WRONG_TYPE"

    try:
        if ext == "pdf":
            text, page_count = extract_text_from_pdf(file_bytes)
        else:
            text, page_count = extract_text_from_docx(file_bytes)
    except Exception:
        return "", 0, "UNREADABLE"

    word_count = len(text.split())
    if word_count < 50:
        return text, page_count, "UNREADABLE"
    if page_count > 2:
        return text, page_count, "PAGE_LIMIT"

    return text, page_count, None


# ── OpenRouter client ─────────────────────────────────────────────────────────

async def call_openrouter(
    prompt: str,
    model: str,
    temperature: float = 0.0,
    max_tokens: int = 1000,
    tools: list[dict] | None = None,
) -> tuple[str, int, int, int]:
    start = time.monotonic()
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "marketmyself.com",
        "X-Title": "MarketMySelf",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if tools:
        payload["tools"] = tools
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()

    latency_ms = int((time.monotonic() - start) * 1000)
    data = response.json()
    text = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    tokens_input  = usage.get("prompt_tokens", 0)
    tokens_output = usage.get("completion_tokens", 0)
    return text, tokens_input, tokens_output, latency_ms


# ── JSON safety parser ────────────────────────────────────────────────────────

def safe_parse_json(raw: str) -> tuple[dict, bool]:
    import re
    cleaned = raw.strip()

    # Strip markdown code fences anywhere in the response
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    # Try the full cleaned string first
    try:
        return json.loads(cleaned), True
    except Exception:
        pass

    # Fallback: find the outermost JSON object (handles preamble/postamble text)
    start = cleaned.find("{")
    end   = cleaned.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(cleaned[start : end + 1]), True
        except Exception:
            pass

    logger.warning("safe_parse_json: could not extract JSON. First 200 chars: %r", raw[:200])
    return {}, False


# ── Prompt fetcher ────────────────────────────────────────────────────────────

def get_active_prompt(feature: str, db: Session) -> str:
    row = (
        db.query(PromptTemplate)
        .filter(PromptTemplate.feature == feature, PromptTemplate.is_active.is_(True))
        .first()
    )
    if not row:
        raise ValueError(f"No active prompt for feature '{feature}'")
    return row.prompt_text


# ── Classifier ────────────────────────────────────────────────────────────────

async def classify_resume(resume_text: str, db: Session) -> dict:
    prompt_template = get_active_prompt("classifier", db)
    prompt = prompt_template.replace("{{resume_text}}", resume_text[:8000])
    raw, _, _, _ = await call_openrouter(prompt, CHEAP_MODEL, temperature=0.0, max_tokens=200)
    result, _ = safe_parse_json(raw)
    return result


# ── Parser ────────────────────────────────────────────────────────────────────

async def parse_resume(resume_text: str, db: Session) -> dict:
    word_count = len(resume_text.split())
    if word_count < 400:
        max_tokens = 800
    elif word_count <= 700:
        max_tokens = 1200
    else:
        max_tokens = 1500

    prompt_template = get_active_prompt("parser", db)
    prompt = prompt_template.replace("{{resume_text}}", resume_text)
    raw, _, _, _ = await call_openrouter(prompt, CHEAP_MODEL, temperature=0.0, max_tokens=max_tokens)
    result, success = safe_parse_json(raw)
    if not success or not result:
        result = {
            "candidate_name": None,
            "contact": {},
            "summary": None,
            "experience": [],
            "education": [],
            "skills": [],
            "certifications": [],
            "word_count": word_count,
            "inferred_seniority": "mid",
        }
    else:
        result.setdefault("word_count", word_count)
    return result


# ── Token scaler ──────────────────────────────────────────────────────────────

def get_max_tokens(word_count: int, feature: str) -> int:
    # Base scale by resume length
    if word_count < 400:
        base = 3000
    elif word_count <= 700:
        base = 4000
    else:
        base = 5000

    # Recruiter and hiring_manager produce the largest outputs (15 keywords + gaps + plans)
    if feature in ("recruiter", "hiring_manager"):
        return base + 3000
    # Rewriter rewrites every bullet — also verbose
    if feature == "rewriter":
        return base + 2000
    return base


# ── Feature executor ──────────────────────────────────────────────────────────

async def run_feature(
    feature: FeatureType,
    job_position: str,
    company: str,
    job_description: str,
    parsed_resume: dict,
    missing_keywords: list[str],
    db: Session,
) -> tuple[str, str, dict, bool, int, int, int]:
    prompt_template = get_active_prompt(feature, db)
    seniority = parsed_resume.get("inferred_seniority", "mid")
    word_count = parsed_resume.get("word_count", 300)

    prompt = (
        prompt_template
        .replace("{{job_position}}", job_position)
        .replace("{{company}}", company)
        .replace("{{job_description}}", job_description)
        .replace("{{seniority}}", seniority)
        .replace("{{resume_json}}", json.dumps(parsed_resume))
        .replace("{{missing_keywords}}", json.dumps(missing_keywords))
    )

    temperature = 0.3 if feature == "rewriter" else 0.0
    max_tokens  = get_max_tokens(word_count, feature)
    model       = FRONTIER_MODEL

    raw, tokens_input, tokens_output, latency_ms = await call_openrouter(
        prompt, model, temperature=temperature, max_tokens=max_tokens
    )
    parsed_result, parse_success = safe_parse_json(raw)
    return model, raw, parsed_result, parse_success, tokens_input, tokens_output, latency_ms


# ── Persistence ───────────────────────────────────────────────────────────────

def save_analysis(
    db: Session,
    user_id: uuid.UUID,
    feature: str,
    job_position: str,
    company: str,
    job_description: str,
    resume_hash: str,
    parsed_resume: dict,
    model_used: str,
    raw_response: str,
    parsed_response: dict,
    parse_success: bool,
    tokens_input: int,
    tokens_output: int,
    latency_ms: int,
) -> ResumeAnalysis:
    existing_count = (
        db.query(ResumeAnalysis)
        .filter(
            ResumeAnalysis.user_id == user_id,
            ResumeAnalysis.resume_hash == resume_hash,
        )
        .count()
    )
    resume_version = existing_count + 1

    record = ResumeAnalysis(
        user_id         = user_id,
        feature         = feature,
        job_position    = job_position,
        company         = company,
        job_description = job_description,
        resume_version  = resume_version,
        resume_hash     = resume_hash,
        parsed_resume   = parsed_resume,
        model_used      = model_used,
        raw_response    = raw_response,
        parsed_response = parsed_response,
        parse_success   = parse_success,
        tokens_input    = tokens_input,
        tokens_output   = tokens_output,
        latency_ms      = latency_ms,
    )
    db.add(record)
    db.flush()
    return record


# ── Master orchestrator ───────────────────────────────────────────────────────

async def analyze_resume(
    file_bytes: bytes,
    filename: str,
    job_position: str,
    company: str,
    job_description: str,
    feature: str,
    missing_keywords: list[str],
    user_id: uuid.UUID,
    db: Session,
) -> tuple[ResumeAnalysis | None, ValidationResult | None]:
    # Step 1: structural validation
    resume_text, _page_count, error_code = validate_structure(file_bytes, filename)
    if error_code:
        messages = {
            "WRONG_TYPE":  "Only PDF and DOCX files are accepted.",
            "PAGE_LIMIT":  "Your resume is more than 2 pages. Please shorten it and re-upload.",
            "UNREADABLE":  "We couldn't read your file. Try re-saving it as a PDF and uploading again.",
        }
        return None, ValidationResult(
            is_valid=False,
            error_code=error_code,
            error_message=messages.get(error_code, "Validation failed."),
        )

    # Step 2: classify
    try:
        classification = await classify_resume(resume_text, db)
    except Exception as exc:
        logger.warning("Classifier failed, proceeding anyway: %s", exc)
        classification = {}

    is_resume   = classification.get("is_resume", True)
    confidence  = classification.get("confidence", "low")
    detected_as = classification.get("detected_as", None)

    if not is_resume and confidence in ("high", "medium"):
        return None, ValidationResult(
            is_valid=False,
            error_code="NOT_RESUME",
            error_message=(
                f"This file doesn't look like a resume. "
                f"We detected it as: {detected_as or 'unknown'}. "
                "Please upload your resume."
            ),
            detected_as=detected_as,
        )
    elif not is_resume:
        logger.warning("Classifier flagged file as non-resume with low confidence; proceeding")

    # Step 3: parse
    parsed_resume = await parse_resume(resume_text, db)

    # Step 4: run feature
    model_used, raw_text, parsed_result, parse_success, tokens_input, tokens_output, latency_ms = (
        await run_feature(
            feature=feature,
            job_position=job_position,
            company=company,
            job_description=job_description,
            parsed_resume=parsed_resume,
            missing_keywords=missing_keywords,
            db=db,
        )
    )

    # Step 5: persist
    resume_hash = compute_file_hash(file_bytes)
    record = save_analysis(
        db=db,
        user_id=user_id,
        feature=feature,
        job_position=job_position,
        company=company,
        job_description=job_description,
        resume_hash=resume_hash,
        parsed_resume=parsed_resume,
        model_used=model_used,
        raw_response=raw_text,
        parsed_response=parsed_result,
        parse_success=parse_success,
        tokens_input=tokens_input,
        tokens_output=tokens_output,
        latency_ms=latency_ms,
    )
    return record, None
