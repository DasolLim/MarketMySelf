"""Tests for scraper/normalizer.py — all pure functions, no network/DB."""
from datetime import datetime, timedelta, timezone

import pytest

from scraper.normalizer import (
    extract_skills,
    map_category,
    normalize_employment_type,
    normalize_exp_level,
    normalize_posted_at,
    normalize_salary,
    normalize_work_type,
    strip_html,
)


# ── normalize_posted_at ───────────────────────────────────────────────────────

class TestNormalizePostedAt:
    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def test_just_now(self):
        result = normalize_posted_at("just now")
        assert result is not None
        assert abs((self._now() - result).total_seconds()) < 5

    def test_relative_hours(self):
        result = normalize_posted_at("3 hours ago")
        expected = self._now() - timedelta(hours=3)
        assert result is not None
        assert abs((result - expected).total_seconds()) < 5

    def test_posted_prefix(self):
        result = normalize_posted_at("Posted 5 hours ago")
        expected = self._now() - timedelta(hours=5)
        assert result is not None
        assert abs((result - expected).total_seconds()) < 5

    def test_one_day_ago(self):
        result = normalize_posted_at("1 day ago")
        expected = self._now() - timedelta(days=1)
        assert result is not None
        assert abs((result - expected).total_seconds()) < 5

    def test_unix_timestamp_seconds(self):
        ts = 1705312200
        result = normalize_posted_at(ts)
        assert result == datetime.fromtimestamp(ts, tz=timezone.utc)

    def test_unix_timestamp_milliseconds(self):
        ts_ms = 1705312200000
        result = normalize_posted_at(ts_ms)
        assert result == datetime.fromtimestamp(ts_ms // 1000, tz=timezone.utc)

    def test_unix_timestamp_string(self):
        result = normalize_posted_at("1705312200")
        assert result == datetime.fromtimestamp(1705312200, tz=timezone.utc)

    def test_iso_8601_z(self):
        result = normalize_posted_at("2024-01-15T10:30:00Z")
        assert result == datetime(2024, 1, 15, 10, 30, 0, tzinfo=timezone.utc)

    def test_iso_date_only(self):
        result = normalize_posted_at("2024-06-01")
        assert result is not None
        assert result.year == 2024 and result.month == 6 and result.day == 1

    def test_today_string(self):
        result = normalize_posted_at("Today")
        assert result is not None
        assert abs((self._now() - result).total_seconds()) < 5

    def test_none_returns_none(self):
        assert normalize_posted_at(None) is None

    def test_empty_string_returns_none(self):
        assert normalize_posted_at("") is None

    def test_unparseable_returns_none(self):
        assert normalize_posted_at("whenever") is None

    def test_result_is_timezone_aware(self):
        result = normalize_posted_at("1 hour ago")
        assert result is not None
        assert result.tzinfo is not None


# ── normalize_salary ──────────────────────────────────────────────────────────

class TestNormalizeSalary:
    def test_k_range(self):
        lo, hi, cur = normalize_salary("$120k-$160k")
        assert lo == 120_000
        assert hi == 160_000
        assert cur == "USD"

    def test_full_number_range(self):
        lo, hi, _ = normalize_salary("$120,000 - $160,000")
        assert lo == 120_000
        assert hi == 160_000

    def test_em_dash_range(self):
        lo, hi, _ = normalize_salary("$80k–$100k")
        assert lo == 80_000
        assert hi == 100_000

    def test_hourly_rate_converted_to_annual(self):
        lo, hi, _ = normalize_salary("$50/hr")
        assert lo == hi == 50 * 2080

    def test_single_value(self):
        lo, hi, _ = normalize_salary("$100k")
        assert lo == 100_000
        assert hi == 100_000

    def test_numeric_min_max_fallback(self):
        lo, hi, cur = normalize_salary(None, min_val=80_000, max_val=120_000)
        assert lo == 80_000
        assert hi == 120_000
        assert cur == "USD"

    def test_custom_currency(self):
        _, _, cur = normalize_salary(None, currency="GBP")
        assert cur == "GBP"

    def test_none_returns_nones(self):
        lo, hi, cur = normalize_salary(None)
        assert lo is None and hi is None and cur == "USD"

    def test_unparseable_returns_nones(self):
        lo, hi, _ = normalize_salary("competitive salary")
        assert lo is None and hi is None

    def test_zero_min_max_treated_as_missing(self):
        lo, hi, _ = normalize_salary(None, min_val=0, max_val=0)
        assert lo is None and hi is None

    def test_dict_annual(self):
        lo, hi, cur = normalize_salary({"min": 120000, "max": 160000, "currency": "USD", "period": "YEAR"})
        assert lo == 120000 and hi == 160000 and cur == "USD"

    def test_dict_hourly_converts_to_annual(self):
        lo, hi, cur = normalize_salary({"min": 50, "max": 75, "currency": "USD", "period": "HOUR"})
        assert lo == 50 * 2080 and hi == 75 * 2080

    def test_dict_monthly_converts_to_annual(self):
        lo, hi, _ = normalize_salary({"min": 10000, "max": 15000, "period": "MONTH"})
        assert lo == 120000 and hi == 180000

    def test_dict_null_currency_defaults_to_usd(self):
        _, _, cur = normalize_salary({"min": 100000, "max": 150000, "currency": None, "period": "YEAR"})
        assert cur == "USD"

    def test_dict_min_only_sets_max_equal(self):
        lo, hi, _ = normalize_salary({"min": 100000, "max": None, "period": "YEAR"})
        assert lo == 100000 and hi == 100000

    def test_dict_both_null_returns_nones(self):
        lo, hi, _ = normalize_salary({"min": None, "max": None, "period": "YEAR"})
        assert lo is None and hi is None


# ── normalize_work_type ───────────────────────────────────────────────────────

class TestNormalizeWorkType:
    def test_remote_in_location(self):
        assert normalize_work_type("Remote", None) == "remote"

    def test_remote_flag(self):
        assert normalize_work_type(None, None, is_remote=True) == "remote"

    def test_hybrid_in_location(self):
        assert normalize_work_type("New York, NY (Hybrid)", None) == "hybrid"

    def test_hybrid_in_description(self):
        assert normalize_work_type(None, "Hybrid work model, 3 days in office") == "hybrid"

    def test_on_site_location(self):
        assert normalize_work_type("New York, NY", None) == "on_site"

    def test_on_site_in_description(self):
        assert normalize_work_type(None, "This is an on-site role in our NYC office") == "on_site"

    def test_location_takes_priority_over_description(self):
        assert normalize_work_type("Remote", "Must work on-site at our HQ") == "remote"

    def test_none_when_nothing(self):
        assert normalize_work_type(None, None) is None

    def test_empty_strings_return_none(self):
        assert normalize_work_type("", "") is None


# ── normalize_exp_level ───────────────────────────────────────────────────────

class TestNormalizeExpLevel:
    def test_senior_title(self):
        level, conf = normalize_exp_level("Senior Software Engineer")
        assert level == "senior"
        assert conf >= 1.0

    def test_junior_title(self):
        level, _ = normalize_exp_level("Junior Developer")
        assert level == "entry"

    def test_intern_title(self):
        level, _ = normalize_exp_level("Software Engineering Internship")
        assert level == "internship"

    def test_staff_engineer(self):
        level, _ = normalize_exp_level("Staff Engineer, Backend")
        assert level == "lead"

    def test_director_title(self):
        level, _ = normalize_exp_level("Director of Engineering")
        assert level == "executive"

    def test_unknown_title_returns_none(self):
        level, conf = normalize_exp_level("Software Engineer")
        assert level is None
        assert conf == 0.0

    def test_from_description_gives_lower_confidence(self):
        level, conf = normalize_exp_level(
            "Software Engineer",
            description="We require 5+ years of experience with Python.",
        )
        assert level == "senior"
        assert conf < 0.8  # description match → reduced confidence

    def test_empty_title_no_description(self):
        level, conf = normalize_exp_level("")
        assert level is None
        assert conf == 0.0

    def test_roman_numeral_iii(self):
        level, _ = normalize_exp_level("Software Engineer III")
        assert level == "senior"

    def test_roman_numeral_iii_with_prefix(self):
        level, _ = normalize_exp_level("Engenharia Software Engineer III Golang")
        assert level == "senior"

    def test_roman_numeral_iv(self):
        level, _ = normalize_exp_level("Software Engineer IV")
        assert level == "senior"

    def test_staff_software_engineer(self):
        level, _ = normalize_exp_level("Staff Software Engineer")
        assert level == "lead"

    def test_principal_engineer(self):
        level, _ = normalize_exp_level("Principal Engineer")
        assert level == "lead"

    def test_ambiguous_titles_stay_none(self):
        assert normalize_exp_level("Software Engineer")[0] is None
        assert normalize_exp_level("Python Developer")[0] is None
        assert normalize_exp_level("Full Stack Developer")[0] is None


# ── normalize_employment_type ─────────────────────────────────────────────────

class TestNormalizeEmploymentType:
    def test_full_time_hyphen(self):
        assert normalize_employment_type("Full-Time") == "full_time"

    def test_full_time_spaced(self):
        assert normalize_employment_type("full time") == "full_time"

    def test_part_time(self):
        assert normalize_employment_type("Part-Time") == "part_time"

    def test_contract(self):
        assert normalize_employment_type("CONTRACT") == "contract"

    def test_freelance(self):
        assert normalize_employment_type("Freelance") == "contract"

    def test_internship(self):
        assert normalize_employment_type("Internship") == "internship"

    def test_none_returns_none(self):
        assert normalize_employment_type(None) is None

    def test_unknown_returns_none(self):
        assert normalize_employment_type("Unspecified") is None


# ── extract_skills ────────────────────────────────────────────────────────────

class TestExtractSkills:
    def test_known_skills_found(self):
        skills = extract_skills("We use Python and React in our stack.")
        assert "Python" in skills
        assert "React" in skills

    def test_case_insensitive(self):
        skills = extract_skills("Experience with python and DOCKER required.")
        assert "Python" in skills
        assert "Docker" in skills

    def test_multiple_skills(self):
        skills = extract_skills("We use Python, React, PostgreSQL, and AWS.")
        for expected in ("Python", "React", "PostgreSQL", "AWS"):
            assert expected in skills

    def test_kubernetes_alias(self):
        assert "Kubernetes" in extract_skills("Proficiency in k8s is required.")

    def test_ci_cd_pattern(self):
        assert "CI/CD" in extract_skills("You will maintain CI/CD pipelines.")

    def test_no_skills_returns_empty(self):
        assert extract_skills("A great opportunity to join our team.") == []

    def test_none_returns_empty(self):
        assert extract_skills(None) == []

    def test_empty_returns_empty(self):
        assert extract_skills("") == []

    def test_word_boundary_go(self):
        # "Go" as golang should not match inside "Google"
        skills = extract_skills("Use Google Cloud for infrastructure.")
        assert "Go" not in skills


# ── map_category ──────────────────────────────────────────────────────────────

class TestMapCategory:
    def test_engineering(self):
        assert map_category("Senior Software Engineer", None) == "engineering"

    def test_data(self):
        assert map_category("Data Scientist", None) == "data"

    def test_finance(self):
        assert map_category("Finance Manager", None) == "finance"

    def test_design(self):
        assert map_category("UX Designer", None) == "design"

    def test_marketing(self):
        assert map_category("Marketing Manager", None) == "marketing"

    def test_sales(self):
        assert map_category("Account Executive", None) == "sales"

    def test_operations(self):
        assert map_category("Customer Success Manager", None) == "operations"

    def test_product(self):
        assert map_category("Product Manager", None) == "product"

    def test_other(self):
        assert map_category("Chief Happiness Officer", None) == "other"

    def test_description_used_when_title_ambiguous(self):
        category = map_category("Associate", "join our financial controller team")
        assert category == "finance"


# ── strip_html ────────────────────────────────────────────────────────────────

class TestStripHtml:
    def test_basic_tags(self):
        result = strip_html("<p>Hello <b>world</b></p>")
        assert result == "Hello world"

    def test_none_returns_none(self):
        assert strip_html(None) is None

    def test_empty_returns_none(self):
        assert strip_html("") is None

    def test_plain_text_passthrough(self):
        assert strip_html("plain text") == "plain text"

    def test_list_items(self):
        result = strip_html("<ul><li>Python</li><li>Docker</li></ul>")
        assert result is not None
        assert "Python" in result
        assert "Docker" in result
