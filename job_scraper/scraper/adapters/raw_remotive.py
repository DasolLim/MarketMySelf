from scraper.adapters.base import BaseAdapter
from scraper.deduplicator import compute_content_hash
from scraper.models import ScrapedJob
from scraper.normalizer import (
    extract_skills, map_category, normalize_employment_type,
    normalize_exp_level, normalize_posted_at, normalize_salary,
    normalize_work_type, strip_html,
)


class RemotiveRawAdapter(BaseAdapter):
    source = "remotive"

    def adapt(self, raw: dict) -> ScrapedJob | None:
        title   = (raw.get("title") or "").strip()
        company = (raw.get("company_name") or "").strip()
        if not title or not company:
            return None

        desc_html = raw.get("description") or ""
        desc_text = strip_html(desc_html)

        tags = raw.get("tags") or []
        tag_str = " ".join(tags) if isinstance(tags, list) else ""

        salary_str = raw.get("salary") or None
        sal_min, sal_max, currency = normalize_salary(salary_str)

        region = raw.get("candidate_required_location") or ""
        work_type = normalize_work_type(region, desc_text, is_remote=True)
        emp_type = normalize_employment_type(raw.get("job_type"))
        exp_level, conf = normalize_exp_level(title, desc_text)
        posted_at = normalize_posted_at(raw.get("publication_date"))

        source_url = raw.get("url") or ""

        return ScrapedJob(
            content_hash=compute_content_hash(title, company, desc_text),
            source=self.source,
            source_urls=[source_url] if source_url else [],
            source_job_id=str(raw.get("id") or ""),
            title=title,
            company=company,
            company_slug=company.lower().replace(" ", "-"),
            remote_raw=region or "Remote",
            work_type=work_type,
            employment_type=emp_type,
            experience_level=exp_level,
            exp_level_confidence=conf,
            category=map_category(title + " " + tag_str, desc_text),
            description_html=desc_html or None,
            description_text=desc_text,
            skills=extract_skills((desc_text or "") + " " + tag_str),
            salary_min=sal_min,
            salary_max=sal_max,
            salary_currency=currency,
            salary_raw=salary_str,
            posted_at=posted_at,
        )
