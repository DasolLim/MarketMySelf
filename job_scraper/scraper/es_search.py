from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from elasticsearch import AsyncElasticsearch


@dataclass
class ESJobSearchParams:
    query: str | None = None
    work_types: list[str] = field(default_factory=list)
    exp_levels: list[str] = field(default_factory=list)
    employment_types: list[str] = field(default_factory=list)
    skills: list[str] = field(default_factory=list)
    salary_min: int | None = None
    salary_max: int | None = None
    location_city: str | None = None
    company: str | None = None
    sources: list[str] = field(default_factory=list)
    posted_within_days: int | None = None
    page: int = 1
    page_size: int = 20

    def validated(self) -> "ESJobSearchParams":
        """Return a copy with page/page_size clamped and skills lowercased."""
        return ESJobSearchParams(
            query=self.query,
            work_types=list(self.work_types),
            exp_levels=list(self.exp_levels),
            employment_types=list(self.employment_types),
            skills=[s.lower() for s in self.skills],
            salary_min=self.salary_min,
            salary_max=self.salary_max,
            location_city=self.location_city,
            company=self.company,
            sources=list(self.sources),
            posted_within_days=self.posted_within_days,
            page=max(1, self.page),
            page_size=min(max(1, self.page_size), 100),
        )


@dataclass
class ESJobFacets:
    work_types: dict[str, int] = field(default_factory=dict)
    exp_levels: dict[str, int] = field(default_factory=dict)
    employment_types: dict[str, int] = field(default_factory=dict)
    sources: dict[str, int] = field(default_factory=dict)


@dataclass
class ESJobSearchResult:
    total: int
    page: int
    page_size: int
    hits: list[dict]
    facets: ESJobFacets | None = None


def build_es_query(params: ESJobSearchParams) -> dict:
    """Build a full ES request body from ESJobSearchParams.

    Always filters to is_active=True. Skills filters use AND semantics
    (each specified skill must appear). Salary filtering:
      - params.salary_min → salary_max >= that value (job pays enough)
      - params.salary_max → salary_min <= that value (job is within budget)
    """
    must: list[dict] = []
    filters: list[dict] = []

    if params.query:
        must.append({
            "multi_match": {
                "query":     params.query,
                "fields":    ["title^3", "company_name^2", "description_text"],
                "type":      "best_fields",
                "fuzziness": "AUTO",
            }
        })

    filters.append({"term": {"is_active": True}})

    if params.work_types:
        filters.append({"terms": {"work_type": params.work_types}})
    if params.exp_levels:
        filters.append({"terms": {"exp_level": params.exp_levels}})
    if params.employment_types:
        filters.append({"terms": {"employment_type": params.employment_types}})
    if params.sources:
        filters.append({"terms": {"source": params.sources}})

    for skill in params.skills:
        filters.append({"term": {"skills": skill}})

    if params.salary_min is not None:
        filters.append({"range": {"salary_max": {"gte": params.salary_min}}})
    if params.salary_max is not None:
        filters.append({"range": {"salary_min": {"lte": params.salary_max}}})

    if params.location_city:
        filters.append({"term": {"location_city": params.location_city}})

    if params.company:
        filters.append({"term": {"company_name.lower": params.company.lower()}})

    if params.posted_within_days:
        cutoff = (
            datetime.now(timezone.utc) - timedelta(days=params.posted_within_days)
        ).isoformat()
        filters.append({"range": {"posted_at": {"gte": cutoff}}})

    sort: list = (
        [{"_score": "desc"}, {"posted_at": {"order": "desc", "missing": "_last"}}]
        if params.query
        else [{"posted_at": {"order": "desc", "missing": "_last"}}]
    )

    from_ = (params.page - 1) * params.page_size

    return {
        "query": {
            "bool": {
                "must":   must or [{"match_all": {}}],
                "filter": filters,
            }
        },
        "aggs": {
            "work_types":       {"terms": {"field": "work_type",       "size": 10}},
            "exp_levels":       {"terms": {"field": "exp_level",       "size": 10}},
            "employment_types": {"terms": {"field": "employment_type", "size": 10}},
            "sources":          {"terms": {"field": "source",          "size": 20}},
        },
        "sort":    sort,
        "_source": True,
        "from":    from_,
        "size":    params.page_size,
    }


async def es_search_jobs(
    es: "AsyncElasticsearch",
    index: str,
    params: ESJobSearchParams,
) -> ESJobSearchResult:
    """Execute a search and return a structured result with facets."""
    p = params.validated()
    body = build_es_query(p)
    try:
        response = await es.search(index=index, body=body)
    except Exception as exc:
        print(f"[es_search] query failed: {exc}")
        return ESJobSearchResult(total=0, page=p.page, page_size=p.page_size, hits=[])

    resp = response.body
    total = resp["hits"]["total"]["value"]
    hits = [
        {**h["_source"], "_score": h.get("_score")}
        for h in resp["hits"]["hits"]
    ]

    raw_aggs = resp.get("aggregations", {})
    facets = ESJobFacets(
        work_types={
            b["key"]: b["doc_count"]
            for b in raw_aggs.get("work_types", {}).get("buckets", [])
        },
        exp_levels={
            b["key"]: b["doc_count"]
            for b in raw_aggs.get("exp_levels", {}).get("buckets", [])
        },
        employment_types={
            b["key"]: b["doc_count"]
            for b in raw_aggs.get("employment_types", {}).get("buckets", [])
        },
        sources={
            b["key"]: b["doc_count"]
            for b in raw_aggs.get("sources", {}).get("buckets", [])
        },
    )

    return ESJobSearchResult(
        total=total, page=p.page, page_size=p.page_size, hits=hits, facets=facets
    )


async def es_get_job(
    es: "AsyncElasticsearch",
    index: str,
    job_id: str,
) -> dict | None:
    """Fetch a single job document by Postgres UUID. Returns None if not found."""
    try:
        response = await es.get(index=index, id=job_id)
        if response.body.get("found"):
            return response.body["_source"]
        return None
    except Exception:
        return None
