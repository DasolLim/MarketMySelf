from datetime import datetime

import pytest

from scraper.deduplicator import deduplicate, make_id
from scraper.models import ScrapedJob


def _job(id: str, title: str = "Engineer", company: str = "Acme", url: str = "https://example.com/1") -> ScrapedJob:
    return ScrapedJob(
        id=id,
        source="dice",
        source_id="",
        source_url=url,
        title=title,
        company=company,
        experience_level="senior",
        posted_at=datetime(2026, 5, 12, 10, 0, 0),
    )


class TestMakeId:
    def test_deterministic_for_same_inputs(self):
        a = make_id("Senior Engineer", "Acme Corp", "https://example.com/job/1")
        b = make_id("Senior Engineer", "Acme Corp", "https://example.com/job/1")
        assert a == b

    def test_differs_for_different_url(self):
        a = make_id("Senior Engineer", "Acme Corp", "https://example.com/job/1")
        b = make_id("Senior Engineer", "Acme Corp", "https://example.com/job/2")
        assert a != b

    def test_differs_for_different_title(self):
        a = make_id("Senior Engineer", "Acme", "https://example.com/job/1")
        b = make_id("Junior Engineer", "Acme", "https://example.com/job/1")
        assert a != b

    def test_differs_for_different_company(self):
        a = make_id("Engineer", "Acme", "https://example.com/job/1")
        b = make_id("Engineer", "Globex", "https://example.com/job/1")
        assert a != b

    def test_case_insensitive(self):
        a = make_id("Senior Engineer", "Acme Corp", "https://example.com/job/1")
        b = make_id("SENIOR ENGINEER", "ACME CORP", "HTTPS://EXAMPLE.COM/JOB/1")
        assert a == b

    def test_strips_whitespace(self):
        a = make_id("Senior Engineer", "Acme", "https://example.com/job/1")
        b = make_id("  Senior Engineer  ", "  Acme  ", "  https://example.com/job/1  ")
        assert a == b

    def test_returns_16_char_hex(self):
        result = make_id("Engineer", "Acme", "https://example.com/1")
        assert len(result) == 16
        assert all(c in "0123456789abcdef" for c in result)


class TestDeduplicate:
    def test_removes_exact_duplicates(self):
        job = _job("abc123")
        result = deduplicate([job, job])
        assert len(result) == 1

    def test_preserves_order_of_first_occurrence(self):
        j1 = _job("aaa", title="First")
        j2 = _job("bbb", title="Second")
        j3 = _job("aaa", title="First duplicate")
        result = deduplicate([j1, j2, j3])
        assert [j.id for j in result] == ["aaa", "bbb"]
        assert result[0].title == "First"

    def test_unique_jobs_all_preserved(self):
        jobs = [_job(f"id{i}") for i in range(5)]
        result = deduplicate(jobs)
        assert len(result) == 5

    def test_empty_list(self):
        assert deduplicate([]) == []

    def test_single_job(self):
        job = _job("solo")
        assert deduplicate([job]) == [job]

    def test_all_duplicates_collapses_to_one(self):
        job = _job("dup")
        result = deduplicate([job, job, job])
        assert len(result) == 1
        assert result[0].id == "dup"
