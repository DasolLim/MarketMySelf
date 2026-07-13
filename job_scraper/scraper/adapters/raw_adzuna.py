from scraper.adapters.base import BaseAdapter
from scraper.deduplicator import compute_content_hash
from scraper.models import ScrapedJob
from scraper.normalizer import (
    extract_skills, map_category, normalize_employment_type,
    normalize_exp_level, normalize_posted_at, normalize_salary,
    normalize_work_type, strip_html,
)


class AdzunaRawAdapter(BaseAdapter):
    source = "adzuna"

    def adapt(self, raw: dict) -> ScrapedJob | None:
        title   = (raw.get("title") or "").strip()
        company_obj = raw.get("company") or {}
        company = (
            company_obj.get("display_name", "")
            if isinstance(company_obj, dict)
            else str(company_obj)
        ).strip()
        if not title or not company:
            return None

        loc_obj  = raw.get("location") or {}
        location = (
            loc_obj.get("display_name", "") if isinstance(loc_obj, dict) else str(loc_obj)
        )
        area = loc_obj.get("area", []) if isinstance(loc_obj, dict) else []
        city = area[-1] if area else (location.split(",")[0].strip() or None)

        desc_html = raw.get("description") or ""
        desc_text = strip_html(desc_html)

        sal_min, sal_max, currency = normalize_salary(
            None,
            min_val=raw.get("salary_min"),
            max_val=raw.get("salary_max"),
        )

        contract_type = raw.get("contract_type") or raw.get("contract_time") or ""
        work_type = normalize_work_type(location, desc_text)
        emp_type = normalize_employment_type(contract_type)
        exp_level, conf = normalize_exp_level(title, desc_text)
        posted_at = normalize_posted_at(raw.get("created"))

        cat_obj  = raw.get("category") or {}
        cat_label = cat_obj.get("label", "") if isinstance(cat_obj, dict) else ""
        category = map_category(title + " " + cat_label, desc_text)

        source_url = raw.get("redirect_url") or ""

        return ScrapedJob(
            content_hash=compute_content_hash(title, company, desc_text),
            source=self.source,
            source_urls=[source_url] if source_url else [],
            source_job_id=str(raw.get("id") or ""),
            title=title,
            company=company,
            company_slug=company.lower().replace(" ", "-"),
            location_city=city,
            remote_raw=location,
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
