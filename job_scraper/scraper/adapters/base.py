from abc import ABC, abstractmethod

from scraper.models import ScrapedJob


class BaseAdapter(ABC):
    """Abstract base: converts a raw JSONB dict from raw_jobs into a ScrapedJob."""

    source: str = ""

    @abstractmethod
    def adapt(self, raw: dict) -> ScrapedJob | None:
        """Return a ScrapedJob or None if the row lacks required fields."""

    def _log(self, msg: str) -> None:
        print(f"[{self.source}] {msg}")
