from scraper.adapters.base import BaseAdapter
from scraper.deduplicator import compute_content_hash
from scraper.models import ScrapedJob
from scraper.normalizer import (
    extract_skills, map_category, normalize_employment_type,
    normalize_exp_level, normalize_posted_at, normalize_salary,
    normalize_work_type, strip_html,
)


class DiceRawAdapter(BaseAdapter):
    source = "dice"

    def adapt(self, raw: dict) -> ScrapedJob | None:
        title   = (raw.get("title") or raw.get("jobTitle") or "").strip()
        company = (raw.get("companyName") or "").strip()
        if not title or not company:
            return None

        loc_obj  = raw.get("jobLocation") or {}
        location = (
            loc_obj.get("displayName", "") if isinstance(loc_obj, dict) else str(loc_obj)
        )
        workplace = raw.get("workplaceTypes") or []
        is_remote = any("remote" in str(w).lower() for w in workplace)

        desc_html = raw.get("summary") or raw.get("description") or ""
        desc_text = strip_html(desc_html)

        salary_str = str(raw["salary"]) if raw.get("salary") else None
        sal_min, sal_max, currency = normalize_salary(salary_str)

        work_type = normalize_work_type(location, desc_text, is_remote)
        exp_level, conf = normalize_exp_level(title, desc_text)
        emp_type = normalize_employment_type(raw.get("employmentType"))
        posted_at = normalize_posted_at(raw.get("postedDate") or raw.get("modifiedDate"))

        source_url = raw.get("detailsPageUrl") or ""
        city = None if is_remote else (location.split(",")[0].strip() or None)

        return ScrapedJob(
            content_hash=compute_content_hash(title, company, desc_text),
            source=self.source,
            source_urls=[source_url] if source_url else [],
            source_job_id=str(raw.get("id") or raw.get("guid") or ""),
            title=title,
            company=company,
            company_slug=company.lower().replace(" ", "-"),
            location_city=city,
            remote_raw="Remote" if is_remote else location,
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
