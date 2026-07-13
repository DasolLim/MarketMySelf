"""
Hacker News — "Ask HN: Who is Hiring?" monthly thread.

Flow:
  1. Algolia HN search → find the latest "Who is Hiring?" thread ID
  2. HN Firebase API → fetch thread metadata (comment IDs)
  3. HN Firebase API → fetch each top-level comment concurrently

Each top-level comment is one job posting (plain text, no schema).
"""
import asyncio
import re

import httpx

SOURCE = "hn_hiring"
_ALGOLIA = "https://hn.algolia.com/api/v1/search"
_HN_ITEM = "https://hacker-news.firebaseio.com/v0/item/{}.json"
_MAX_COMMENTS = 200
_CONCURRENCY = 20


async def fetch(query: str = "") -> list[dict]:
    """
    Returns raw comment dicts from the latest HN hiring thread.
    Each dict has: id, by, text (HTML), time, parent, thread_id, thread_title.
    Filters out deleted/dead comments.
    """
    thread = await _find_latest_thread()
    if not thread:
        print("[hn_hiring] could not find latest hiring thread")
        return []

    thread_id = thread["objectID"]
    thread_title = thread.get("title", "")
    print(f"[hn_hiring] thread: {thread_title!r} (id={thread_id})")

    kids = await _get_thread_kids(thread_id)
    if not kids:
        print("[hn_hiring] no comments found")
        return []

    kids = kids[:_MAX_COMMENTS]
    comments = await _fetch_comments(kids)

    # Optional: filter by query keywords in comment text
    if query:
        kw = query.lower()
        comments = [c for c in comments if kw in (c.get("text") or "").lower()]

    for c in comments:
        c["thread_id"] = thread_id
        c["thread_title"] = thread_title

    print(f"[hn_hiring] fetched {len(comments)} job comments")
    return comments


async def _find_latest_thread() -> dict | None:
    params = {
        "tags": "ask_hn",
        "query": "Ask HN: Who is hiring?",
        "hitsPerPage": 5,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(_ALGOLIA, params=params)
        hits = resp.json().get("hits", [])
    except Exception as exc:
        print(f"[hn_hiring] Algolia search failed: {exc}")
        return None

    # Pick the most recent thread whose title matches "who is hiring"
    for hit in hits:
        title = hit.get("title", "").lower()
        if "who is hiring" in title and "freelancer" not in title:
            return hit
    return hits[0] if hits else None


async def _get_thread_kids(thread_id: str) -> list[int]:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(_HN_ITEM.format(thread_id))
        return resp.json().get("kids", [])
    except Exception as exc:
        print(f"[hn_hiring] failed to fetch thread {thread_id}: {exc}")
        return []


async def _fetch_comments(ids: list[int]) -> list[dict]:
    sem = asyncio.Semaphore(_CONCURRENCY)

    async def _one(comment_id: int) -> dict | None:
        async with sem:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(_HN_ITEM.format(comment_id))
                data = resp.json()
                if data and not data.get("deleted") and not data.get("dead"):
                    return data
            except Exception:
                pass
            return None

    results = await asyncio.gather(*[_one(cid) for cid in ids])
    return [r for r in results if r]
