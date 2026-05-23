import time
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from schemas.scraped_job import (
    ScrapedJobCard,
    ScrapedJobDetail,
    ScrapedJobFacets,
    ScrapedJobSearchParams,
    ScrapedJobSearchResponse,
)


def _build_where(
    params: ScrapedJobSearchParams,
    skip_work_type: bool = False,
    skip_exp_level: bool = False,
    skip_employment_type: bool = False,
    skip_category: bool = False,
) -> tuple[list[str], dict[str, Any]]:
    """Return (conditions, bind_params). Shared by main query and facet queries."""
    conditions: list[str] = ["(s.expires_at IS NULL OR s.expires_at > NOW())"]
    bind: dict[str, Any] = {}

    has_query = bool(params.query and params.query.strip())
    bind["has_query"] = has_query
    bind["query"] = params.query.strip() if has_query else ""

    if has_query:
        conditions.append(
            "to_tsvector('english', COALESCE(s.title,'') || ' ' || COALESCE(s.description_text,''))"
            " @@ plainto_tsquery('english', :query)"
        )

    if not skip_work_type and params.work_types:
        conditions.append("s.work_type = ANY(:work_types)")
        bind["work_types"] = params.work_types

    if not skip_exp_level and params.experience_levels:
        conditions.append("s.experience_level = ANY(:experience_levels)")
        bind["experience_levels"] = params.experience_levels

    if not skip_employment_type and params.employment_types:
        conditions.append("s.employment_type = ANY(:employment_types)")
        bind["employment_types"] = params.employment_types

    if params.sources:
        conditions.append("s.source = ANY(:sources)")
        bind["sources"] = params.sources

    if params.skills:
        conditions.append(
            "EXISTS ("
            "  SELECT 1 FROM job_skills js"
            "  WHERE js.job_id = s.id"
            "  AND LOWER(js.skill) = ANY(:skills)"
            ")"
        )
        bind["skills"] = [s.lower() for s in params.skills]

    if params.salary_min is not None:
        conditions.append("s.salary_max >= :salary_min")
        bind["salary_min"] = params.salary_min

    if params.salary_max is not None:
        conditions.append("s.salary_min <= :salary_max")
        bind["salary_max"] = params.salary_max

    if params.location_city:
        conditions.append("LOWER(s.location_city) = LOWER(:location_city)")
        bind["location_city"] = params.location_city

    if params.company:
        conditions.append("LOWER(s.company) LIKE LOWER(:company)")
        bind["company"] = f"%{params.company}%"

    if not skip_category and params.category:
        conditions.append("s.category = :category")
        bind["category"] = params.category

    if params.posted_within_days:
        conditions.append(
            "s.posted_at >= NOW() - (:posted_within_days || ' days')::INTERVAL"
        )
        bind["posted_within_days"] = str(params.posted_within_days)

    return conditions, bind


def _row_to_card(row: Any) -> ScrapedJobCard:
    return ScrapedJobCard(
        id=str(row["id"]),
        title=row["title"],
        company=row["company"],
        company_slug=row["company_slug"],
        work_type=row["work_type"],
        experience_level=row["experience_level"],
        employment_type=row["employment_type"],
        salary_min=row["salary_min"],
        salary_max=row["salary_max"],
        salary_currency=row["salary_currency"],
        salary_raw=row["salary_raw"],
        location_city=row["location_city"],
        location_country=row["location_country"],
        source=row["source"],
        source_urls=list(row["source_urls"] or []),
        posted_at=row["posted_at"],
        scraped_at=row["scraped_at"],
        skills=list(row["skills"] or []),
        category=row["category"],
        remote_raw=row["remote_raw"],
    )


def search_scraped_jobs(
    params: ScrapedJobSearchParams,
    db: Session,
    include_facets: bool = False,
) -> ScrapedJobSearchResponse:
    t0 = time.perf_counter()

    has_query = bool(params.query and params.query.strip())
    conditions, bind = _build_where(params)

    where = " AND ".join(conditions)
    order = (
        "rank DESC, s.posted_at DESC NULLS LAST"
        if has_query
        else "s.posted_at DESC NULLS LAST"
    )

    offset = params.page * params.page_size
    bind["page_size"] = params.page_size
    bind["offset"] = offset

    sql = text(f"""
        SELECT
          s.id::text,
          s.title,
          s.company,
          s.company_slug,
          s.work_type,
          s.experience_level,
          s.employment_type,
          s.salary_min,
          s.salary_max,
          s.salary_currency,
          s.salary_raw,
          s.location_city,
          s.location_country,
          s.source,
          s.source_urls,
          s.posted_at,
          s.scraped_at,
          s.category,
          s.remote_raw,
          ARRAY(
            SELECT skill FROM job_skills WHERE job_id = s.id ORDER BY skill
          ) AS skills,
          CASE WHEN :has_query THEN
            ts_rank(
              to_tsvector('english', COALESCE(s.title,'') || ' ' || COALESCE(s.description_text,'')),
              plainto_tsquery('english', :query)
            )
          ELSE 0.0 END AS rank,
          COUNT(*) OVER () AS total_count
        FROM scraped_jobs s
        WHERE {where}
        ORDER BY {order}
        LIMIT :page_size OFFSET :offset
    """)

    rows = db.execute(sql, bind).mappings().all()
    total = int(rows[0]["total_count"]) if rows else 0
    jobs = [_row_to_card(r) for r in rows]

    facets: ScrapedJobFacets | None = None
    if include_facets:
        facets = _fetch_facets(params, db)

    took_ms = (time.perf_counter() - t0) * 1000
    return ScrapedJobSearchResponse(
        jobs=jobs,
        total=total,
        page=params.page,
        page_size=params.page_size,
        took_ms=round(took_ms, 1),
        facets=facets,
    )


def _fetch_facets(params: ScrapedJobSearchParams, db: Session) -> ScrapedJobFacets:
    def _run(conditions: list[str], bind: dict[str, Any], col: str) -> dict[str, int]:
        where = " AND ".join(conditions)
        rows = db.execute(
            text(f"""
                SELECT {col} AS facet_key, COUNT(*) AS count
                FROM scraped_jobs s
                WHERE {where}
                  AND {col} IS NOT NULL
                GROUP BY {col}
                ORDER BY count DESC
            """),
            bind,
        ).mappings().all()
        return {r["facet_key"]: int(r["count"]) for r in rows}

    cond_all, bind_all = _build_where(params)
    cond_no_wt, bind_no_wt = _build_where(params, skip_work_type=True)
    cond_no_el, bind_no_el = _build_where(params, skip_exp_level=True)
    cond_no_et, bind_no_et = _build_where(params, skip_employment_type=True)
    cond_no_cat, bind_no_cat = _build_where(params, skip_category=True)

    work_types = _run(cond_no_wt, bind_no_wt, "s.work_type")
    experience_levels = _run(cond_no_el, bind_no_el, "s.experience_level")
    employment_types = _run(cond_no_et, bind_no_et, "s.employment_type")
    categories = _run(cond_no_cat, bind_no_cat, "s.category")

    # Top skills
    where_all = " AND ".join(cond_all)
    skill_rows = db.execute(
        text(f"""
            SELECT js.skill, COUNT(DISTINCT s.id) AS count
            FROM scraped_jobs s
            JOIN job_skills js ON js.job_id = s.id
            WHERE {where_all}
            GROUP BY js.skill
            ORDER BY count DESC
            LIMIT 20
        """),
        bind_all,
    ).mappings().all()
    top_skills = {r["skill"]: int(r["count"]) for r in skill_rows}

    # Salary stats
    sal_row = db.execute(
        text(f"""
            SELECT
              MIN(s.salary_min)::int                             AS min,
              MAX(s.salary_max)::int                             AS max,
              AVG((s.salary_min + s.salary_max) / 2.0)::int     AS avg
            FROM scraped_jobs s
            WHERE {where_all}
              AND s.salary_min IS NOT NULL
              AND s.salary_max IS NOT NULL
        """),
        bind_all,
    ).mappings().first()
    salary_stats: dict[str, Any] = {
        "min": sal_row["min"] if sal_row else None,
        "max": sal_row["max"] if sal_row else None,
        "avg": sal_row["avg"] if sal_row else None,
    }

    return ScrapedJobFacets(
        work_types=work_types,
        experience_levels=experience_levels,
        employment_types=employment_types,
        categories=categories,
        top_skills=top_skills,
        salary_stats=salary_stats,
    )


def get_scraped_job(job_id: str, db: Session) -> ScrapedJobDetail | None:
    row = db.execute(
        text("""
            SELECT
              s.id::text,
              s.title, s.company, s.company_slug,
              s.work_type, s.experience_level, s.employment_type,
              s.salary_min, s.salary_max, s.salary_currency, s.salary_raw,
              s.location_city, s.location_country,
              s.source, s.source_urls,
              s.posted_at, s.scraped_at,
              s.category, s.remote_raw,
              s.description_text, s.description_html,
              ARRAY(
                SELECT skill FROM job_skills WHERE job_id = s.id ORDER BY skill
              ) AS skills
            FROM scraped_jobs s
            WHERE s.id::text = :job_id
              AND (s.expires_at IS NULL OR s.expires_at > NOW())
        """),
        {"job_id": job_id},
    ).mappings().first()

    if row is None:
        return None

    description_html: str | None = None
    if row["description_html"]:
        try:
            import bleach
            allowed_tags = [
                "p", "br", "ul", "ol", "li", "strong", "em", "b", "i",
                "h1", "h2", "h3", "h4", "span", "div", "a",
            ]
            allowed_attrs: dict = {"a": ["href", "title", "target"]}
            description_html = bleach.clean(
                row["description_html"],
                tags=allowed_tags,
                attributes=allowed_attrs,
                strip=True,
            )
        except ImportError:
            pass

    return ScrapedJobDetail(
        id=str(row["id"]),
        title=row["title"],
        company=row["company"],
        company_slug=row["company_slug"],
        work_type=row["work_type"],
        experience_level=row["experience_level"],
        employment_type=row["employment_type"],
        salary_min=row["salary_min"],
        salary_max=row["salary_max"],
        salary_currency=row["salary_currency"],
        salary_raw=row["salary_raw"],
        location_city=row["location_city"],
        location_country=row["location_country"],
        source=row["source"],
        source_urls=list(row["source_urls"] or []),
        posted_at=row["posted_at"],
        scraped_at=row["scraped_at"],
        skills=list(row["skills"] or []),
        category=row["category"],
        remote_raw=row["remote_raw"],
        description_text=row["description_text"],
        description_html=description_html,
    )
