from scraper.adapters.raw_dice import DiceRawAdapter
from scraper.adapters.raw_serpapi import SerpApiRawAdapter
from scraper.adapters.raw_jsearch import JSearchRawAdapter
from scraper.adapters.raw_adzuna import AdzunaRawAdapter
from scraper.adapters.raw_himalayas import HimalayasRawAdapter
from scraper.adapters.raw_remoteok import RemoteOKRawAdapter
from scraper.adapters.raw_remotive import RemotiveRawAdapter
from scraper.adapters.raw_jobicy import JobicyRawAdapter
from scraper.adapters.raw_hn_hiring import HNHiringRawAdapter

# Phase 2 raw adapters: source name → adapter class
ALL_RAW_ADAPTERS: dict[str, type] = {
    "dice":      DiceRawAdapter,
    "serpapi":   SerpApiRawAdapter,
    "jsearch":   JSearchRawAdapter,
    "adzuna":    AdzunaRawAdapter,
    "himalayas": HimalayasRawAdapter,
    "remoteok":  RemoteOKRawAdapter,
    "remotive":  RemotiveRawAdapter,
    "jobicy":    JobicyRawAdapter,
    "hn_hiring": HNHiringRawAdapter,
}
