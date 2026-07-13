import argparse
import asyncio
import json
import sys
import time
from datetime import datetime, timezone

from scraper.adapters import ALL_RAW_ADAPTERS
from scraper.raw.runner import ALL_SOURCES, run_raw

_VALID_RAW_SOURCES      = sorted(ALL_SOURCES.keys())
_VALID_ADAPTER_SOURCES  = sorted(ALL_RAW_ADAPTERS.keys())


# ── fetch-raw ─────────────────────────────────────────────────────────────────

def _build_raw_parser(sub: argparse.ArgumentParser) -> None:
    sub.add_argument(
        "--query",
        default="software engineer",
        help="Search query passed to every source (default: 'software engineer').",
    )
    sub.add_argument(
        "--sources",
        nargs="+",
        choices=_VALID_RAW_SOURCES,
        metavar="SOURCE",
        default=None,
        help=f"Which sources to fetch (default: all). Choices: {', '.join(_VALID_RAW_SOURCES)}",
    )
    sub.add_argument(
        "--no-db",
        action="store_true",
        dest="no_db",
        help="Skip writing results to raw_jobs table.",
    )
    sub.add_argument(
        "--output",
        default=None,
        help="Path to write raw JSON output. Omit to pretty-print to stdout.",
    )


async def _run_raw(args: argparse.Namespace) -> None:
    t0 = time.perf_counter()
    results = await run_raw(
        query=args.query,
        sources=args.sources,
        write_db=not args.no_db,
    )
    elapsed = time.perf_counter() - t0

    total = sum(len(v) for v in results.values())
    print(
        f"[cli] fetch-raw finished in {elapsed:.1f}s — {total} total items",
        file=sys.stderr,
    )

    payload = json.dumps(
        {
            "query":      args.query,
            "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sources":    {src: items for src, items in results.items()},
        },
        indent=2,
        default=str,
    )

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(payload)
        print(f"[cli] wrote output to {args.output}", file=sys.stderr)
    else:
        print(payload)


# ── normalize ─────────────────────────────────────────────────────────────────

def _build_normalize_parser(sub: argparse.ArgumentParser) -> None:
    sub.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Max raw_jobs rows to process per run (default: 100).",
    )
    sub.add_argument(
        "--sources",
        nargs="+",
        choices=_VALID_ADAPTER_SOURCES,
        metavar="SOURCE",
        default=None,
        help=f"Only normalise rows from these sources. Choices: {', '.join(_VALID_ADAPTER_SOURCES)}",
    )
    sub.add_argument(
        "--no-db",
        action="store_true",
        dest="no_db",
        help="Dry run — normalise but do not write to scraped_jobs.",
    )
    sub.add_argument(
        "--output",
        default=None,
        help="Path to write normalised JSON output.",
    )
    sub.add_argument(
        "--reprocess",
        action="store_true",
        help=(
            "Reset processed_at on target raw_jobs rows and re-normalise, "
            "overwriting salary/exp_level/description in existing scraped_jobs records."
        ),
    )


async def _run_normalize(args: argparse.Namespace) -> None:
    from scraper.es_client import get_es_client
    from scraper.runner import process_raw_batch

    t0 = time.perf_counter()
    summary = await process_raw_batch(
        limit=args.limit,
        sources=args.sources,
        write_db=not args.no_db,
        reprocess=getattr(args, "reprocess", False),
        es_client=get_es_client(),
    )
    elapsed = time.perf_counter() - t0

    print(
        f"[cli] normalize finished in {elapsed:.1f}s — "
        f"{summary['raw_rows']} raw → {summary['unique']} unique "
        f"({summary['errors']} errors)",
        file=sys.stderr,
    )

    if args.output or args.no_db:
        payload = json.dumps(
            {
                "normalised_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "summary": {k: v for k, v in summary.items() if k != "jobs"},
                "jobs": [j.to_dict() for j in summary["jobs"]],
            },
            indent=2,
            default=str,
        )
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(payload)
            print(f"[cli] wrote {summary['unique']} jobs to {args.output}", file=sys.stderr)
        else:
            print(payload)


# ── es ────────────────────────────────────────────────────────────────────────

def _build_es_parser(sub: argparse.ArgumentParser) -> None:
    es_subs = sub.add_subparsers(dest="es_command", required=True)

    es_subs.add_parser("setup", help="Create the ES index with mapping. Safe to run multiple times.")

    reindex_sub = es_subs.add_parser(
        "reindex",
        help="Bulk index all active jobs from Postgres into ES.",
    )
    reindex_sub.add_argument(
        "--reset",
        action="store_true",
        help="Delete and recreate the index before reindexing (use when mapping changes).",
    )

    es_subs.add_parser("status", help="Print index health and document count.")

    del_sub = es_subs.add_parser("delete-job", help="Remove a single document by UUID.")
    del_sub.add_argument("job_uuid", help="Postgres UUID of the job to delete from the index.")

    search_sub = es_subs.add_parser("search", help="Search indexed jobs via Elasticsearch.")
    search_sub.add_argument("query", nargs="?", default=None, help="Full-text search query.")
    search_sub.add_argument("--work-type",        nargs="+", dest="work_types",        default=[], metavar="TYPE")
    search_sub.add_argument("--exp-level",         nargs="+", dest="exp_levels",        default=[], metavar="LEVEL")
    search_sub.add_argument("--employment-type",   nargs="+", dest="employment_types",  default=[], metavar="TYPE")
    search_sub.add_argument("--skills",            nargs="+", default=[],               metavar="SKILL")
    search_sub.add_argument("--salary-min",        type=int,  default=None,             dest="salary_min")
    search_sub.add_argument("--salary-max",        type=int,  default=None,             dest="salary_max")
    search_sub.add_argument("--city",              default=None)
    search_sub.add_argument("--company",           default=None)
    search_sub.add_argument("--sources",           nargs="+", default=[],               metavar="SOURCE")
    search_sub.add_argument("--posted-within",     type=int,  default=None,             dest="posted_within_days",
                            metavar="DAYS")
    search_sub.add_argument("--page",              type=int,  default=1)
    search_sub.add_argument("--page-size",         type=int,  default=20,               dest="page_size")
    search_sub.add_argument("--facets",            action="store_true")
    search_sub.add_argument("--json",              action="store_true",                 dest="as_json")

    get_job_sub = es_subs.add_parser("get-job", help="Fetch a single job document by UUID.")
    get_job_sub.add_argument("job_uuid", help="Postgres UUID of the job to fetch.")


async def _run_es(args: argparse.Namespace) -> None:
    import asyncpg
    from config import settings
    from scraper.es_client import get_es_client
    from scraper.es_index import create_index, delete_index
    from scraper.es_indexer import delete_job, full_reindex

    es = get_es_client()
    if es is None:
        # Search/get-job degrade gracefully; management commands require ES.
        if args.es_command in ("search", "get-job"):
            print("Elasticsearch is not configured (ELASTICSEARCH_URL not set).")
            return
        print(
            "[cli] ES not configured — set ELASTICSEARCH_URL in .env.",
            file=sys.stderr,
        )
        sys.exit(1)

    if args.es_command == "setup":
        await create_index(es, settings.ELASTICSEARCH_INDEX)
        print(f"[cli] index ready: {settings.ELASTICSEARCH_INDEX}")

    elif args.es_command == "reindex":
        if args.reset:
            await delete_index(es, settings.ELASTICSEARCH_INDEX)
            await create_index(es, settings.ELASTICSEARCH_INDEX)

        conn = await asyncpg.connect(settings.DATABASE_URL)
        try:
            result = await full_reindex(es, settings.ELASTICSEARCH_INDEX, conn)
        finally:
            await conn.close()

        print(
            f"[cli] reindex complete — "
            f"{result['indexed']}/{result['total']} indexed, "
            f"{result['errors']} errors",
        )

    elif args.es_command == "status":
        try:
            info = await es.cat.indices(
                index=settings.ELASTICSEARCH_INDEX, format="json", h="health,docs.count,store.size"
            )
            count = await es.count(index=settings.ELASTICSEARCH_INDEX)
            row   = info.body[0] if info.body else {}
            print(
                f"Index:   {settings.ELASTICSEARCH_INDEX}\n"
                f"Status:  {row.get('health', 'unknown')}\n"
                f"Docs:    {count.body['count']}\n"
                f"Size:    {row.get('store.size', 'unknown')}"
            )
        except Exception as exc:
            print(f"[cli] es status failed: {exc}", file=sys.stderr)
            sys.exit(1)

    elif args.es_command == "delete-job":
        ok = await delete_job(es, settings.ELASTICSEARCH_INDEX, args.job_uuid)
        if ok:
            print(f"[cli] deleted {args.job_uuid} from index")
        else:
            print(f"[cli] delete failed for {args.job_uuid}", file=sys.stderr)
            sys.exit(1)

    elif args.es_command == "search":
        from scraper.es_search import ESJobSearchParams, es_search_jobs

        params = ESJobSearchParams(
            query=args.query,
            work_types=args.work_types,
            exp_levels=args.exp_levels,
            employment_types=args.employment_types,
            skills=args.skills,
            salary_min=args.salary_min,
            salary_max=args.salary_max,
            location_city=args.city,
            company=args.company,
            sources=args.sources,
            posted_within_days=args.posted_within_days,
            page=args.page,
            page_size=args.page_size,
        )
        result = await es_search_jobs(es, settings.ELASTICSEARCH_INDEX, params)

        if args.as_json:
            import dataclasses
            print(json.dumps(dataclasses.asdict(result), indent=2, default=str))
        else:
            pages = max(1, -(-result.total // result.page_size))
            print(f"\nFound {result.total} jobs  (page {result.page}/{pages})\n")
            for i, hit in enumerate(result.hits, start=1 + (result.page - 1) * result.page_size):
                salary = ""
                if hit.get("salary_min") or hit.get("salary_max"):
                    lo = f"${hit['salary_min']//1000}k" if hit.get("salary_min") else ""
                    hi = f"${hit['salary_max']//1000}k" if hit.get("salary_max") else ""
                    salary = f"  |  {lo}–{hi} {hit.get('salary_currency','')}"
                location = hit.get("location_city") or hit.get("work_type") or ""
                print(
                    f"{i:3}. {hit.get('title','')} @ {hit.get('company_name','')}"
                    f"  [{hit.get('work_type','')} / {hit.get('exp_level','')}]"
                )
                if location or salary:
                    print(f"      {location}{salary}")
                urls = hit.get("source_urls") or []
                if urls:
                    print(f"      {urls[0]}")
                print()

            if args.facets and result.facets:
                print("── Facets ───────────────────────────────")
                for label, counts in (
                    ("work_type",       result.facets.work_types),
                    ("exp_level",       result.facets.exp_levels),
                    ("employment_type", result.facets.employment_types),
                    ("source",          result.facets.sources),
                ):
                    if counts:
                        print(f"  {label}:")
                        for k, v in counts.items():
                            print(f"    {k}: {v}")

    elif args.es_command == "get-job":
        from scraper.es_search import es_get_job

        doc = await es_get_job(es, settings.ELASTICSEARCH_INDEX, args.job_uuid)
        if doc:
            print(json.dumps(doc, indent=2, default=str))
        else:
            print(f"[cli] not found: {args.job_uuid}", file=sys.stderr)
            sys.exit(1)

    await es.close()


# ── entry point ───────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="cli.py",
        description="Job scraper CLI — raw ingestion, normalisation, and ES index management.",
    )
    subs = parser.add_subparsers(dest="command", required=True)

    raw_sub = subs.add_parser(
        "fetch-raw",
        help="Fetch raw API/scrape responses and store as JSONB in raw_jobs.",
    )
    _build_raw_parser(raw_sub)

    norm_sub = subs.add_parser(
        "normalize",
        help="Normalise unprocessed raw_jobs rows into scraped_jobs.",
    )
    _build_normalize_parser(norm_sub)

    es_sub = subs.add_parser(
        "es",
        help="Elasticsearch index management (setup / reindex / status / delete-job).",
    )
    _build_es_parser(es_sub)

    return parser


async def _main(args: argparse.Namespace) -> None:
    if args.command == "fetch-raw":
        await _run_raw(args)
    elif args.command == "normalize":
        await _run_normalize(args)
    elif args.command == "es":
        await _run_es(args)


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()
    asyncio.run(_main(args))


if __name__ == "__main__":
    main()
