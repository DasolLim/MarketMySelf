import re

from scraper.adapters.base import BaseAdapter
from scraper.deduplicator import compute_content_hash
from scraper.models import ScrapedJob
from scraper.normalizer import (
    extract_skills, map_category, normalize_employment_type,
    normalize_exp_level, normalize_posted_at, normalize_salary,
    normalize_work_type, strip_html,
)

# Heuristics to pull a company/role from the freeform HN comment
_PIPE_RE   = re.compile(r"^(.+?)\s*\|\s*(.+)")
_PAREN_RE  = re.compile(r"^(.+?)\s*\(([^)]+)\)")
_EMAIL_RE  = re.compile(r"\S+@\S+\.\S+")


def _parse_hn_comment(text_html: str) -> tuple[str, str, str | None]:
    """Best-effort extraction of (company, title, apply_url) from raw HN HTML text."""
    plain = strip_html(text_html) or ""
    first_line = plain.split("\n")[0].strip()

    m = _PIPE_RE.match(first_line)
    if m:
        company = m.group(1).strip()
        rest    = m.group(2).strip()
        title   = rest.split("|")[0].strip() if "|" in rest else rest
        return company, title or "Software Engineer", None

    m = _PAREN_RE.match(first_line)
    if m:
        company = m.group(1).strip()
        title   = m.group(2).strip()
        return company, title or "Software Engineer", None

    parts = [p.strip() for p in first_line.split("|") if p.strip()]
    if len(parts) >= 2:
        return parts[0], parts[1], None

    return first_line[:80] or "Unknown", "Software Engineer", None


class HNHiringRawAdapter(BaseAdapter):
    source = "hn_hiring"

    def adapt(self, raw: dict) -> ScrapedJob | None:
        text_html = raw.get("text") or ""
        if not text_html:
            return None

        company, title, _ = _parse_hn_comment(text_html)
        company = company.strip()
        title   = title.strip()
        if not company or len(company) < 2:
            return None

        desc_text = strip_html(text_html)

        email_match = _EMAIL_RE.search(text_html)
        apply_url   = f"mailto:{email_match.group()}" if email_match else ""

        thread_title = raw.get("thread_title") or ""
        work_type = normalize_work_type(None, desc_text)
        emp_type  = normalize_employment_type(desc_text)
        exp_level, conf = normalize_exp_level(title, desc_text)
        posted_at = normalize_posted_at(raw.get("time"))

        sal_min, sal_max, currency = normalize_salary(None)

        return ScrapedJob(
            content_hash=compute_content_hash(title, company, desc_text),
            source=self.source,
            source_urls=[apply_url] if apply_url else [],
            source_job_id=str(raw.get("id") or ""),
            title=title,
            company=company,
            company_slug=company.lower().replace(" ", "-"),
            remote_raw=None,
            work_type=work_type,
            employment_type=emp_type,
            experience_level=exp_level,
            exp_level_confidence=conf,
            category=map_category(title, desc_text),
            description_text=desc_text,
            skills=extract_skills(desc_text),
            salary_min=sal_min,
            salary_max=sal_max,
            salary_currency=currency,
            posted_at=posted_at,
        )
