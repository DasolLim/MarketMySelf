from scraper.adapters.base import BaseAdapter
from scraper.deduplicator import compute_content_hash
from scraper.models import ScrapedJob
from scraper.normalizer import (
    extract_skills, map_category, normalize_exp_level,
    normalize_posted_at, normalize_salary, normalize_work_type, strip_html,
)


def _fix_text(value: str | None) -> str | None:
    if not value:
        return value
    try:
        import ftfy
        return ftfy.fix_text(value)
    except ImportError:
        try:
            return value.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            return value


class RemoteOKRawAdapter(BaseAdapter):
    source = "remoteok"

    def adapt(self, raw: dict) -> ScrapedJob | None:
        title   = _fix_text((raw.get("title") or raw.get("position") or "").strip())
        company = _fix_text((raw.get("company") or "").strip())
        if not title or not company:
            return None

        desc_html = _fix_text(raw.get("description") or "")
        desc_text = strip_html(desc_html)

        tags = raw.get("tags") or []
        tag_str = " ".join(tags) if isinstance(tags, list) else ""

        sal_min, sal_max, currency = normalize_salary(
            None,
            min_val=raw.get("salary_min"),
            max_val=raw.get("salary_max"),
        )

        work_type = normalize_work_type(None, desc_text, is_remote=True)
        exp_level, conf = normalize_exp_level(title, desc_text)
        posted_at = normalize_posted_at(raw.get("date") or raw.get("epoch"))

        source_url = raw.get("apply_url") or raw.get("url") or ""

        return ScrapedJob(
            content_hash=compute_content_hash(title, company, desc_text),
            source=self.source,
            source_urls=[source_url] if source_url else [],
            source_job_id=str(raw.get("id") or raw.get("slug") or ""),
            title=title,
            company=company,
            company_slug=company.lower().replace(" ", "-"),
            remote_raw="Remote",
            work_type=work_type,
            experience_level=exp_level,
            exp_level_confidence=conf,
            category=map_category(title + " " + tag_str, desc_text),
            description_html=desc_html or None,
            description_text=desc_text,
            skills=extract_skills((desc_text or "") + " " + tag_str),
            salary_min=sal_min,
            salary_max=sal_max,
            salary_currency=currency,
            posted_at=posted_at,
        )
