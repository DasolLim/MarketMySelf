from scraper.adapters.base import BaseAdapter
from scraper.deduplicator import compute_content_hash
from scraper.models import ScrapedJob
from scraper.normalizer import (
    extract_skills, map_category, normalize_employment_type,
    normalize_exp_level, normalize_posted_at, normalize_salary,
    normalize_work_type, strip_html,
)


class SerpApiRawAdapter(BaseAdapter):
    source = "serpapi"

    def adapt(self, raw: dict) -> ScrapedJob | None:
        title   = (raw.get("title") or raw.get("job_title") or "").strip()
        company = (raw.get("company_name") or "").strip()
        if not title or not company:
            return None

        location = (raw.get("location") or "").strip()
        desc_html = raw.get("description") or ""
        desc_text = strip_html(desc_html)

        ext = raw.get("detected_extensions") or {}
        posted_raw = ext.get("posted_at") or raw.get("posted_at")
        schedule   = ext.get("schedule_type") or ""
        salary_str = ext.get("salary") or None

        sal_min, sal_max, currency = normalize_salary(salary_str)
        work_type = normalize_work_type(location, desc_text)
        exp_level, conf = normalize_exp_level(title, desc_text)
        emp_type = normalize_employment_type(schedule)
        posted_at = normalize_posted_at(posted_raw)

        apply_opts = raw.get("apply_options") or []
        source_url = (apply_opts[0].get("link") if apply_opts else None) or raw.get("share_link") or ""

        return ScrapedJob(
            content_hash=compute_content_hash(title, company, desc_text),
            source=self.source,
            source_urls=[source_url] if source_url else [],
            source_job_id=str(raw.get("job_id") or ""),
            title=title,
            company=company,
            company_slug=company.lower().replace(" ", "-"),
            location_city=location.split(",")[0].strip() or None,
            remote_raw=location,
            work_type=work_type,
            employment_type=emp_type,
            experience_level=exp_level,
            exp_level_confidence=conf,
            category=map_category(title, desc_text),
            description_html=desc_html or None,
            description_text=desc_text,
            skills=extract_skills(desc_text),
            salary_min=sal_min,
            salary_max=sal_max,
            salary_currency=currency,
            salary_raw=salary_str,
            posted_at=posted_at,
        )
