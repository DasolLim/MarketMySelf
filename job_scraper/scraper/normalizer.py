import re
from datetime import datetime, timedelta, timezone

from bs4 import BeautifulSoup


# ── Date parsing ──────────────────────────────────────────────────────────────

def normalize_posted_at(raw: str | int | float | None) -> datetime | None:
    """Parse any date format seen across job boards into a UTC datetime."""
    if raw is None:
        return None

    now = datetime.now(timezone.utc)

    if isinstance(raw, (int, float)):
        ts = int(raw)
        if ts > 9_999_999_999:
            ts //= 1000
        return datetime.fromtimestamp(ts, tz=timezone.utc)

    raw_str = str(raw).strip()
    if not raw_str:
        return None

    for fmt in (
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            dt = datetime.strptime(raw_str, fmt)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            pass

    if re.fullmatch(r"\d{10,13}", raw_str):
        ts = int(raw_str)
        if ts > 9_999_999_999:
            ts //= 1000
        return datetime.fromtimestamp(ts, tz=timezone.utc)

    lowered = raw_str.lower()
    if lowered in ("just now", "today", "posted today"):
        return now

    lowered = re.sub(r"^posted\s+", "", lowered)

    for pattern, unit in (
        (r"(\d+)\s*(?:minute|min)s?\s*ago", "minutes"),
        (r"(\d+)\s*h(?:ours?)?\s*ago",      "hours"),
        (r"(\d+)\s*days?\s*ago",             "days"),
        (r"(\d+)\s*weeks?\s*ago",            "weeks"),
        (r"(\d+)\s*months?\s*ago",           "months"),
    ):
        m = re.search(pattern, lowered)
        if m:
            n = int(m.group(1))
            if unit == "months":
                return now - timedelta(days=n * 30)
            return now - timedelta(**{unit: n})

    return None


# ── Salary ────────────────────────────────────────────────────────────────────

def _parse_value(s: str) -> int | None:
    s = s.replace(",", "").strip()
    m = re.match(r"([\d.]+)(k?)$", s, re.I)
    if not m:
        return None
    v = float(m.group(1))
    if m.group(2).lower() == "k":
        v *= 1000
    return int(v)


def normalize_salary(
    salary_str: str | dict | None = None,
    min_val: int | float | None = None,
    max_val: int | float | None = None,
    currency: str = "USD",
) -> tuple[int | None, int | None, str]:
    """Return (salary_min, salary_max, currency). salary_str takes precedence over min/max.

    salary_str may also be a dict with keys: min, max, currency, period.
    period values: "YEAR" (pass-through), "MONTH" (×12), "HOUR" (×2080).
    """
    if isinstance(salary_str, dict):
        d = salary_str
        raw_min = d.get("min")
        raw_max = d.get("max")
        s_currency = d.get("currency") or currency
        period = (d.get("period") or "YEAR").upper()
        lo = int(raw_min) if raw_min else None
        hi = int(raw_max) if raw_max else None
        if period == "HOUR":
            lo = int(lo * 2080) if lo else None
            hi = int(hi * 2080) if hi else None
        elif period == "MONTH":
            lo = int(lo * 12) if lo else None
            hi = int(hi * 12) if hi else None
        if lo and not hi:
            hi = lo
        return lo, hi, s_currency

    if salary_str:
        text = salary_str.strip()
        hourly = re.search(r"\$?([\d,]+(?:\.\d+)?)\s*(?:/hr|per hour|/hour)", text, re.I)
        if hourly:
            rate = float(hourly.group(1).replace(",", ""))
            annual = int(rate * 2080)
            return annual, annual, currency

        rng = re.search(r"\$?([\d,]+\.?\d*k?)\s*[-–]\s*\$?([\d,]+\.?\d*k?)", text, re.I)
        if rng:
            lo = _parse_value(rng.group(1))
            hi = _parse_value(rng.group(2))
            if lo and hi:
                return lo, hi, currency
            if lo:
                return lo, None, currency

        single = re.search(r"\$?([\d,]+\.?\d*k?)", text, re.I)
        if single:
            v = _parse_value(single.group(1))
            if v:
                return v, v, currency

    lo = int(min_val) if min_val else None
    hi = int(max_val) if max_val else None
    return lo, hi, currency


# ── Work type ─────────────────────────────────────────────────────────────────

def normalize_work_type(
    location: str | None = None,
    description: str | None = None,
    is_remote: bool | None = None,
) -> str | None:
    if is_remote is True:
        return "remote"

    for text in (location or "", description or ""):
        t = text.lower()
        if not t:
            continue
        if "hybrid" in t:
            return "hybrid"
        if "remote" in t:
            return "remote"
        if any(w in t for w in ("on-site", "on site", "in-office", "in office", "onsite")):
            return "on_site"

    if location and any(c.isalpha() for c in location):
        return "on_site"

    return None


# ── Experience level ──────────────────────────────────────────────────────────

_EXP_TIERS: list[tuple[str, float, list[str]]] = [
    ("internship", 1.0, ["intern ", "internship", "co-op", "coop"]),
    ("entry",      1.0, ["entry level", "entry-level", "junior", "jr.", " jr ", "new grad", "graduate"]),
    ("entry",      0.8, ["0-2 years", "0-1 year", "1-2 years", "1+ year"]),
    ("mid",        1.0, ["mid-level", "mid level", "intermediate", "associate"]),
    ("mid",        0.8, ["2-5 years", "3-5 years", "2+ years", "3+ years"]),
    ("senior",     1.0, ["senior", "sr.", " sr ", "lead engineer", "lead developer", " iii", " iv"]),
    ("senior",     0.8, ["5+ years", "5-8 years", "7+ years", "6+ years"]),
    ("lead",       1.0, ["staff engineer", "staff ", "principal", "tech lead", "engineering manager", "team lead"]),
    ("lead",       0.8, ["8+ years", "10+ years"]),
    ("executive",  1.0, ["director", " vp ", "vice president", "cto", "ceo", "coo", "cpo", "head of", "chief "]),
]


def normalize_exp_level(
    title: str,
    description: str | None = None,
) -> tuple[str | None, float]:
    """Return (level, confidence). Checks title first, then first 600 chars of description."""
    title_lower = title.lower()
    for level, conf, terms in _EXP_TIERS:
        for term in terms:
            if term in title_lower:
                return level, conf

    if description:
        desc_lower = description.lower()[:600]
        for level, conf, terms in _EXP_TIERS:
            for term in terms:
                if term in desc_lower:
                    return level, round(conf * 0.65, 2)

    return None, 0.0


# ── Employment type ───────────────────────────────────────────────────────────

_EMPLOYMENT_MAP: list[tuple[str, list[str]]] = [
    ("internship", ["intern", "internship", "co-op", "coop"]),
    ("contract",   ["contract", "contractor", "temp ", "temporary", "freelance", "consulting", "c2c", "1099"]),
    ("part_time",  ["part-time", "part time", "parttime"]),
    ("full_time",  ["full-time", "full time", "fulltime", "permanent", "regular"]),
]


def normalize_employment_type(raw: str | None) -> str | None:
    if not raw:
        return None
    lowered = raw.lower().strip()
    for etype, terms in _EMPLOYMENT_MAP:
        for term in terms:
            if term in lowered:
                return etype
    return None


# ── HTML stripping ────────────────────────────────────────────────────────────

def strip_html(html: str | None) -> str | None:
    if not html:
        return None
    text = BeautifulSoup(html, "lxml").get_text(separator=" ", strip=True)
    return text or None


# ── Skill extraction ──────────────────────────────────────────────────────────

SKILL_PATTERNS: dict[str, re.Pattern] = {
    "Python":       re.compile(r"\bpython\b", re.I),
    "JavaScript":   re.compile(r"\bjavascript\b", re.I),
    "TypeScript":   re.compile(r"\btypescript\b", re.I),
    "Go":           re.compile(r"\bgolang\b|\bgo\b(?=\s+(developer|engineer|backend|lang))", re.I),
    "Rust":         re.compile(r"\brust\b(?!\s+belt)", re.I),
    "Java":         re.compile(r"\bjava\b(?!script)", re.I),
    "C++":          re.compile(r"\bc\+\+|\bcpp\b", re.I),
    "C#":           re.compile(r"\bc#\b|\bcsharp\b", re.I),
    "Swift":        re.compile(r"\bswift\b", re.I),
    "Kotlin":       re.compile(r"\bkotlin\b", re.I),
    "Scala":        re.compile(r"\bscala\b", re.I),
    "Bash":         re.compile(r"\bbash\b|\bshell\s+script", re.I),
    "React":        re.compile(r"\breact\.?js\b|\breact\b", re.I),
    "Vue":          re.compile(r"\bvue\.?js\b|\bvuejs\b", re.I),
    "Angular":      re.compile(r"\bangular\b", re.I),
    "Next.js":      re.compile(r"\bnext\.js\b|\bnextjs\b", re.I),
    "Node.js":      re.compile(r"\bnode\.js\b|\bnodejs\b", re.I),
    "FastAPI":      re.compile(r"\bfastapi\b", re.I),
    "Django":       re.compile(r"\bdjango\b", re.I),
    "Flask":        re.compile(r"\bflask\b", re.I),
    "Spring":       re.compile(r"\bspring\b(?:\s+boot)?", re.I),
    "PostgreSQL":   re.compile(r"\bpostgresql\b|\bpostgres\b", re.I),
    "MySQL":        re.compile(r"\bmysql\b", re.I),
    "MongoDB":      re.compile(r"\bmongodb\b|\bmongo\b", re.I),
    "Redis":        re.compile(r"\bredis\b", re.I),
    "Kafka":        re.compile(r"\bkafka\b", re.I),
    "Spark":        re.compile(r"\bapache\s+spark\b|\bpyspark\b|\bspark\b", re.I),
    "Docker":       re.compile(r"\bdocker\b", re.I),
    "Kubernetes":   re.compile(r"\bkubernetes\b|\bk8s\b", re.I),
    "Terraform":    re.compile(r"\bterraform\b", re.I),
    "AWS":          re.compile(r"\baws\b|\bamazon\s+web\s+services\b", re.I),
    "GCP":          re.compile(r"\bgcp\b|\bgoogle\s+cloud\b", re.I),
    "Azure":        re.compile(r"\bazure\b", re.I),
    "TensorFlow":   re.compile(r"\btensorflow\b", re.I),
    "PyTorch":      re.compile(r"\bpytorch\b", re.I),
    "scikit-learn": re.compile(r"\bscikit-?learn\b|\bsklearn\b", re.I),
    "Pandas":       re.compile(r"\bpandas\b", re.I),
    "NumPy":        re.compile(r"\bnumpy\b", re.I),
    "Airflow":      re.compile(r"\bairflow\b", re.I),
    "dbt":          re.compile(r"\bdbt\b", re.I),
    "Snowflake":    re.compile(r"\bsnowflake\b", re.I),
    "BigQuery":     re.compile(r"\bbigquery\b", re.I),
    "Tableau":      re.compile(r"\btableau\b", re.I),
    "Power BI":     re.compile(r"\bpower\s+bi\b|\bpowerbi\b", re.I),
    "GraphQL":      re.compile(r"\bgraphql\b", re.I),
    "REST":         re.compile(r"\brest(?:ful)?\s+api\b|\brest\s+service", re.I),
    "gRPC":         re.compile(r"\bgrpc\b", re.I),
    "Git":          re.compile(r"\bgit\b(?!\s*hub|\s*lab)", re.I),
    "Figma":        re.compile(r"\bfigma\b", re.I),
    "Salesforce":   re.compile(r"\bsalesforce\b", re.I),
    "Linux":        re.compile(r"\blinux\b", re.I),
    "CI/CD":        re.compile(r"\bci/cd\b|\bcicd\b|\bjenkins\b|\bgithub\s+actions\b", re.I),
    "Agile":        re.compile(r"\bagile\b|\bscrum\b|\bkanban\b", re.I),
}


def extract_skills(text: str | None) -> list[str]:
    if not text:
        return []
    return [skill for skill, pat in SKILL_PATTERNS.items() if pat.search(text)]


# ── Category mapping ──────────────────────────────────────────────────────────

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "engineering": [
        "engineer", "developer", "devops", "sre", "backend", "frontend",
        "fullstack", "full stack", "full-stack", "software", "programmer",
        "architect", "mobile", "ios", "android", "embedded", "firmware",
        "platform", "infrastructure",
    ],
    "data": [
        "data scientist", "data science", "machine learning", "artificial intelligence",
        "deep learning", "data engineer", "analytics", "business intelligence",
        "analyst", "mlops", "nlp", "computer vision",
    ],
    "finance": [
        "finance", "financial", "accountant", "accounting", "controller",
        "investment", "banking", "audit", "tax", "cfo", "quantitative",
    ],
    "design": [
        "designer", "ux", "ui/ux", "user experience", "creative", "graphic",
        "visual", "brand design", "product design", "figma",
    ],
    "marketing": [
        "marketing", "content", "seo", "growth", "brand", "communications",
        "copywriter", "social media", "demand gen", "email marketing",
    ],
    "sales": [
        "sales", "account executive", "business development", "bdr", "sdr",
        "revenue", "account manager", "partnerships", "customer acquisition",
    ],
    "operations": [
        "operations", "supply chain", "logistics", "human resources", "people ops",
        "recruiting", "coordinator", "administrator", "office manager",
        "customer success", "customer support", "program manager",
    ],
    "product": [
        "product manager", "product owner", "product lead", "pm ", "head of product",
    ],
}


def map_category(title: str, description_text: str | None) -> str:
    text = (title + " " + (description_text or "")).lower()
    for cat, terms in CATEGORY_KEYWORDS.items():
        for term in terms:
            if term in text:
                return cat
    return "other"
