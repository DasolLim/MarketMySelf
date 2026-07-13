"""Tests for scraper/es_search.py :: build_es_query — no live ES connection needed."""
import pytest

from scraper.es_search import ESJobSearchParams, build_es_query


def _filters(body: dict) -> list[dict]:
    return body["query"]["bool"]["filter"]


def _must(body: dict) -> list[dict]:
    return body["query"]["bool"]["must"]


# ── empty / default params ─────────────────────────────────────────────────────

def test_empty_params_produces_match_all():
    body = build_es_query(ESJobSearchParams())
    assert _must(body) == [{"match_all": {}}]


def test_is_active_filter_always_present():
    body = build_es_query(ESJobSearchParams())
    assert {"term": {"is_active": True}} in _filters(body)


# ── full-text query ────────────────────────────────────────────────────────────

def test_query_produces_multi_match():
    body = build_es_query(ESJobSearchParams(query="python developer"))
    must = _must(body)
    assert any("multi_match" in clause for clause in must)
    mm = next(c["multi_match"] for c in must if "multi_match" in c)
    assert mm["query"] == "python developer"
    assert "title^3" in mm["fields"]
    assert "description_text" in mm["fields"]


# ── enum / keyword filters ─────────────────────────────────────────────────────

def test_work_types_filter():
    body = build_es_query(ESJobSearchParams(work_types=["remote"]))
    assert {"terms": {"work_type": ["remote"]}} in _filters(body)


def test_exp_level_uses_es_field_name_not_experience_level():
    """Critical: ES field is exp_level, not experience_level (the Postgres column)."""
    body = build_es_query(ESJobSearchParams(exp_levels=["senior"]))
    filters = _filters(body)
    assert {"terms": {"exp_level": ["senior"]}} in filters
    assert not any("experience_level" in str(f) for f in filters)


def test_employment_types_filter():
    body = build_es_query(ESJobSearchParams(employment_types=["full_time"]))
    assert {"terms": {"employment_type": ["full_time"]}} in _filters(body)


def test_sources_filter():
    body = build_es_query(ESJobSearchParams(sources=["dice", "jsearch"]))
    assert {"terms": {"source": ["dice", "jsearch"]}} in _filters(body)


# ── skills filters ─────────────────────────────────────────────────────────────

def test_skills_filter_is_per_term_and():
    """Each skill becomes a separate term filter (AND semantics)."""
    body = build_es_query(ESJobSearchParams(skills=["python", "fastapi"]))
    filters = _filters(body)
    assert {"term": {"skills": "python"}} in filters
    assert {"term": {"skills": "fastapi"}} in filters


def test_skills_lowercased_in_validated_params():
    """Skill casing from caller is normalised to lowercase."""
    params = ESJobSearchParams(skills=["Python", "FastAPI"]).validated()
    body = build_es_query(params)
    filters = _filters(body)
    assert {"term": {"skills": "python"}} in filters
    assert {"term": {"skills": "fastapi"}} in filters


# ── salary filters ─────────────────────────────────────────────────────────────

def test_salary_min_filters_on_salary_max_field():
    """salary_min → job's salary_max must be >= that value (job pays enough)."""
    body = build_es_query(ESJobSearchParams(salary_min=100_000))
    assert {"range": {"salary_max": {"gte": 100_000}}} in _filters(body)


def test_salary_max_filters_on_salary_min_field():
    """salary_max → job's salary_min must be <= that value (job is within budget)."""
    body = build_es_query(ESJobSearchParams(salary_max=200_000))
    assert {"range": {"salary_min": {"lte": 200_000}}} in _filters(body)


def test_salary_min_and_max_both_present():
    body = build_es_query(ESJobSearchParams(salary_min=80_000, salary_max=160_000))
    filters = _filters(body)
    assert {"range": {"salary_max": {"gte": 80_000}}} in filters
    assert {"range": {"salary_min": {"lte": 160_000}}} in filters


# ── location / company filters ─────────────────────────────────────────────────

def test_city_filter():
    body = build_es_query(ESJobSearchParams(location_city="Austin"))
    assert {"term": {"location_city": "Austin"}} in _filters(body)


def test_company_filter_uses_lower_subfield():
    """Company filter must use company_name.lower for case-insensitive matching."""
    body = build_es_query(ESJobSearchParams(company="Acme Corp"))
    assert {"term": {"company_name.lower": "acme corp"}} in _filters(body)


def test_posted_within_days_produces_range():
    body = build_es_query(ESJobSearchParams(posted_within_days=7))
    range_filters = [f for f in _filters(body) if "range" in f and "posted_at" in f.get("range", {})]
    assert len(range_filters) == 1
    assert "gte" in range_filters[0]["range"]["posted_at"]


# ── sort ───────────────────────────────────────────────────────────────────────

def test_sort_by_score_first_when_query_present():
    body = build_es_query(ESJobSearchParams(query="python"))
    assert body["sort"][0] == {"_score": "desc"}


def test_sort_by_recency_when_no_query():
    body = build_es_query(ESJobSearchParams())
    assert body["sort"][0] == {"posted_at": {"order": "desc", "missing": "_last"}}
    assert not any("_score" in str(s) for s in body["sort"])


# ── pagination ─────────────────────────────────────────────────────────────────

def test_pagination_from_offset():
    body = build_es_query(ESJobSearchParams(page=3, page_size=10))
    assert body["from"] == 20
    assert body["size"] == 10


def test_page_size_clamped_to_100_via_validated():
    params = ESJobSearchParams(page_size=500).validated()
    assert params.page_size == 100
    body = build_es_query(params)
    assert body["size"] == 100
