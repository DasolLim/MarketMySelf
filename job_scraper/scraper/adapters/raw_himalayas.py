from scraper.adapters.base import BaseAdapter
from scraper.deduplicator import compute_content_hash
from scraper.models import ScrapedJob
from scraper.normalizer import (
    extract_skills, map_category, normalize_employment_type,
    normalize_exp_level, normalize_posted_at, normalize_salary,
    normalize_work_type, strip_html,
)


class HimalayasRawAdapter(BaseAdapter):
    source = "himalayas"

    def adapt(self, raw: dict) -> ScrapedJob | None:
        title   = (raw.get("title") or "").strip()
        # Himalayas sometimes returns "name" as a placeholder — fall back to slug
        raw_company = raw.get("companyName") or ""
        if raw_company.strip().lower() in ("name", ""):
            slug = raw.get("companySlug") or ""
            raw_company = slug.replace("-", " ").title()
        company = raw_company.strip()
        if not title or not company:
            return None

        desc_html = raw.get("description") or raw.get("excerpt") or ""
        desc_text = strip_html(desc_html)

        sal_min, sal_max, currency = normalize_salary(
            None,
            min_val=raw.get("minSalary"),
            max_val=raw.get("maxSalary"),
            currency=raw.get("currency") or "USD",
        )

        location_restrictions = raw.get("locationRestrictions") or []
        loc_str = ", ".join(location_restrictions) if location_restrictions else ""

        work_type = normalize_work_type(loc_str, desc_text, is_remote=True)
        emp_type = normalize_employment_type(raw.get("employmentType"))
        seniority = raw.get("seniority") or ""
        if isinstance(seniority, list):
            seniority = " ".join(seniority)
        exp_level, conf = normalize_exp_level(title + " " + seniority, desc_text)
        posted_at = normalize_posted_at(raw.get("pubDate"))

        cats = raw.get("categories") or []
        cat_str = " ".join(cats) if isinstance(cats, list) else ""
        category = map_category(title + " " + cat_str, desc_text)

        source_url = raw.get("applicationLink") or ""

        return ScrapedJob(
            content_hash=compute_content_hash(title, company, desc_text),
            source=self.source,
            source_urls=[source_url] if source_url else [],
            source_job_id=str(raw.get("guid") or raw.get("id") or ""),
            title=title,
            company=company,
            company_slug=raw.get("companySlug") or company.lower().replace(" ", "-"),
            remote_raw=loc_str or "Remote",
            work_type=work_type,
            employment_type=emp_type,
            experience_level=exp_level,
            exp_level_confidence=conf,
            category=category,
            description_html=desc_html or None,
            description_text=desc_text,
            skills=extract_skills(desc_text),
            salary_min=sal_min,
            salary_max=sal_max,
            salary_currency=currency,
            posted_at=posted_at,
        )
