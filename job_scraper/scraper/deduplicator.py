import hashlib

from rapidfuzz import fuzz

from scraper.models import ScrapedJob


def compute_content_hash(
    title: str,
    company: str,
    description_text: str | None,
) -> str:
    """SHA-256[:32] of normalised title|company|description[:300]."""
    desc_slice = (description_text or "")[:300].lower()
    raw = f"{title.strip().lower()}|{company.strip().lower()}|{desc_slice}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def is_fuzzy_duplicate(a: ScrapedJob, b: ScrapedJob, threshold: int = 90) -> bool:
    """True when two jobs are likely the same posting on different boards."""
    if a.content_hash == b.content_hash:
        return True
    title_score   = fuzz.ratio(a.title.lower(),   b.title.lower())
    company_score = fuzz.ratio(a.company.lower(), b.company.lower())
    return title_score >= threshold and company_score >= threshold


def deduplicate(jobs: list[ScrapedJob]) -> list[ScrapedJob]:
    """Remove within-batch duplicates by content_hash, preserving first-occurrence order."""
    seen: set[str] = set()
    unique: list[ScrapedJob] = []
    for job in jobs:
        if job.content_hash not in seen:
            seen.add(job.content_hash)
            unique.append(job)
    return unique
