from scraper.adapters.base import BaseAdapter
from scraper.deduplicator import compute_content_hash
from scraper.models import ScrapedJob
from scraper.normalizer import (
    extract_skills, map_category, normalize_employment_type,
    normalize_exp_level, normalize_posted_at, normalize_salary,
    normalize_work_type, strip_html,
)


class JSearchRawAdapter(BaseAdapter):
    source = "jsearch"

    def adapt(self, raw: dict) -> ScrapedJob | None:
        title   = (raw.get("job_title") or "").strip()
        company = (raw.get("employer_name") or "").strip()
        if not title or not company:
            return None

        city    = (raw.get("job_city") or "").strip()
        state   = (raw.get("job_state") or "").strip()
        country = (raw.get("job_country") or "US").strip()
        location = ", ".join(filter(None, [city, state]))

        desc_text = (raw.get("job_description") or "").strip() or None

        _s_min = raw.get("job_min_salary")
        _s_max = raw.get("job_max_salary")
        _salary_dict = (
            {
                "min":      _s_min,
                "max":      _s_max,
                "currency": raw.get("job_salary_currency") or "USD",
                "period":   raw.get("job_salary_period") or "YEAR",
            }
            if (_s_min or _s_max)
            else None
        )
        sal_min, sal_max, currency = normalize_salary(_salary_dict)

        is_remote = raw.get("job_is_remote") or False
        work_type = normalize_work_type(location, desc_text, is_remote)
        exp_level, conf = normalize_exp_level(title, desc_text)
        emp_type = normalize_employment_type(raw.get("job_employment_type"))
        posted_at = normalize_posted_at(raw.get("job_posted_at_datetime_utc"))

        source_url = raw.get("job_apply_link") or raw.get("job_url") or ""

        return ScrapedJob(
            content_hash=compute_content_hash(title, company, desc_text),
            source=self.source,
            source_urls=[source_url] if source_url else [],
            source_job_id=str(raw.get("job_id") or ""),
            title=title,
            company=company,
            company_slug=company.lower().replace(" ", "-"),
            location_city=city or None,
            location_country=country,
            remote_raw="Remote" if is_remote else location,
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
