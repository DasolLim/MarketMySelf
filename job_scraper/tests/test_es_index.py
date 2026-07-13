"""Tests for scraper/es_index.py :: build_document — no live ES connection needed."""
import uuid
from datetime import datetime, timezone

import pytest

from scraper.es_index import build_document
from scraper.models import ScrapedJob


def make_job(**overrides) -> ScrapedJob:
    """Factory with sensible defaults matching actual ScrapedJob field names."""
    defaults = {
        "id":               str(uuid.uuid4()),
        "content_hash":     "abc123",
        "source":           "dice",
        "source_job_id":    "123",
        "source_urls":      ["https://dice.com/job/123"],
        "title":            "Senior Python Developer",
        "company":          "Acme Corp",            # ScrapedJob uses 'company', not 'company_name'
        "description_text": "We are looking for a Python developer.",
        "work_type":        "remote",
        "experience_level": "senior",               # ScrapedJob uses 'experience_level', not 'exp_level'
        "exp_level_confidence": 0.9,
        "employment_type":  "full_time",
        "salary_min":       120_000,
        "salary_max":       160_000,
        "salary_currency":  "USD",
        "salary_raw":       "$120k - $160k",
        "location_city":    "Austin",
        "location_country": "US",
        "location_lat":     30.2672,
        "location_lng":     -97.7431,
        "skills":           ["Python", "FastAPI", "PostgreSQL"],
        "posted_at":        datetime(2026, 5, 13, tzinfo=timezone.utc),
        "scraped_at":       datetime(2026, 5, 14, tzinfo=timezone.utc),
        "expires_at":       None,
    }
    return ScrapedJob(**{**defaults, **overrides})


# ── location ──────────────────────────────────────────────────────────────────

def test_location_included_when_coords_present():
    job = make_job(location_lat=30.2672, location_lng=-97.7431)
    doc = build_document(job)
    assert "location" in doc
    assert doc["location"] == {"lat": 30.2672, "lon": -97.7431}


def test_location_omitted_when_lat_missing():
    job = make_job(location_lat=None, location_lng=-97.7431)
    doc = build_document(job)
    assert "location" not in doc


def test_location_omitted_when_lng_missing():
    job = make_job(location_lat=30.2672, location_lng=None)
    doc = build_document(job)
    assert "location" not in doc


def test_location_omitted_when_both_missing():
    job = make_job(location_lat=None, location_lng=None)
    doc = build_document(job)
    assert "location" not in doc


# ── null field omission ───────────────────────────────────────────────────────

def test_null_salary_fields_omitted():
    job = make_job(salary_min=None, salary_max=None)
    doc = build_document(job)
    assert "salary_min" not in doc
    assert "salary_max" not in doc


def test_null_expires_at_omitted():
    job = make_job(expires_at=None)
    doc = build_document(job)
    assert "expires_at" not in doc


def test_null_exp_level_omitted():
    job = make_job(experience_level=None)
    doc = build_document(job)
    assert "exp_level" not in doc


def test_null_location_city_omitted():
    job = make_job(location_city=None)
    doc = build_document(job)
    assert "location_city" not in doc


# ── always-present fields ─────────────────────────────────────────────────────

def test_skills_always_present():
    job = make_job(skills=[])
    doc = build_document(job)
    assert "skills" in doc
    assert doc["skills"] == []


def test_source_urls_always_present():
    job = make_job(source_urls=[])
    doc = build_document(job)
    assert "source_urls" in doc
    assert doc["source_urls"] == []


def test_is_active_always_present():
    job = make_job()
    doc = build_document(job)
    assert "is_active" in doc


def test_exp_level_confidence_always_present():
    job = make_job()
    doc = build_document(job)
    assert "exp_level_confidence" in doc


# ── field renames ─────────────────────────────────────────────────────────────

def test_company_mapped_to_company_name():
    job = make_job(company="Acme Corp")
    doc = build_document(job)
    assert doc.get("company_name") == "Acme Corp"
    assert "company" not in doc


def test_experience_level_mapped_to_exp_level():
    job = make_job(experience_level="senior")
    doc = build_document(job)
    assert doc.get("exp_level") == "senior"
    assert "experience_level" not in doc


# ── dates ─────────────────────────────────────────────────────────────────────

def test_dates_are_iso_strings():
    job = make_job()
    doc = build_document(job)
    assert isinstance(doc["posted_at"], str)
    assert "2026-05-13" in doc["posted_at"]
    assert isinstance(doc["scraped_at"], str)
    assert "2026-05-14" in doc["scraped_at"]


def test_expires_at_is_iso_string_when_set():
    job = make_job(expires_at=datetime(2026, 5, 17, tzinfo=timezone.utc))
    doc = build_document(job)
    assert isinstance(doc["expires_at"], str)
    assert "2026-05-17" in doc["expires_at"]


# ── is_active logic ───────────────────────────────────────────────────────────

def test_is_active_true_when_expires_at_none():
    job = make_job(expires_at=None)
    doc = build_document(job)
    assert doc["is_active"] is True


def test_is_active_false_when_expired():
    past = datetime(2020, 1, 1, tzinfo=timezone.utc)
    job = make_job(expires_at=past)
    doc = build_document(job)
    assert doc["is_active"] is False


def test_is_active_true_when_not_yet_expired():
    future = datetime(2099, 1, 1, tzinfo=timezone.utc)
    job = make_job(expires_at=future)
    doc = build_document(job)
    assert doc["is_active"] is True


# ── document identity ─────────────────────────────────────────────────────────

def test_document_id_matches_job_id():
    job = make_job()
    doc = build_document(job)
    assert doc.get("id") == job.id


# ── HTML stripping ────────────────────────────────────────────────────────────

def test_residual_html_stripped_from_description():
    job = make_job(description_text="<p>We need a <b>Python</b> developer.</p>")
    doc = build_document(job)
    assert "<p>" not in doc["description_text"]
    assert "Python" in doc["description_text"]


def test_plain_text_description_unchanged():
    job = make_job(description_text="We need a Python developer.")
    doc = build_document(job)
    assert doc["description_text"] == "We need a Python developer."
