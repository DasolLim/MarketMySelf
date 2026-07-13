from scraper.adapters.base import BaseAdapter
from scraper.deduplicator import compute_content_hash
from scraper.models import ScrapedJob
from scraper.normalizer import (
    extract_skills, map_category, normalize_employment_type,
    normalize_exp_level, normalize_posted_at, normalize_salary,
    normalize_work_type, strip_html,
)


class JobicyRawAdapter(BaseAdapter):
    source = "jobicy"

    def adapt(self, raw: dict) -> ScrapedJob | None:
        title   = (raw.get("jobTitle") or "").strip()
        company = (raw.get("companyName") or "").strip()
        if not title or not company:
            return None

        desc_html = raw.get("jobDescription") or raw.get("jobExcerpt") or ""
        desc_text = strip_html(desc_html)

        industry = raw.get("jobIndustry") or ""
        geo      = raw.get("jobGeo") or "Worldwide"

        sal_min, sal_max, currency = normalize_salary(
            None,
            min_val=raw.get("annualSalaryMin"),
            max_val=raw.get("annualSalaryMax"),
            currency=raw.get("salaryCurrency") or "USD",
        )

        work_type = normalize_work_type(geo, desc_text, is_remote=True)
        emp_type = normalize_employment_type(raw.get("jobType"))
        exp_level, conf = normalize_exp_level(
            title + " " + (raw.get("jobLevel") or ""), desc_text
        )
        posted_at = normalize_posted_at(raw.get("pubDate"))

        source_url = raw.get("url") or ""

        return ScrapedJob(
            content_hash=compute_content_hash(title, company, desc_text),
            source=self.source,
            source_urls=[source_url] if source_url else [],
            source_job_id=str(raw.get("id") or ""),
            title=title,
            company=company,
            company_slug=company.lower().replace(" ", "-"),
            remote_raw=geo,
            work_type=work_type,
            employment_type=emp_type,
            experience_level=exp_level,
            exp_level_confidence=conf,
            category=map_category(title + " " + industry, desc_text),
            description_html=desc_html or None,
            description_text=desc_text,
            skills=extract_skills(desc_text),
            salary_min=sal_min,
            salary_max=sal_max,
            salary_currency=currency,
            posted_at=posted_at,
        )
