"""Clients for the open literature APIs the skills use: OpenAlex, arXiv, Crossref, PubMed,
ClinicalTrials.gov and Semantic Scholar.

Standard library only. No key is required. Optional environment variables raise rate limits:
OPENALEX_API_KEY, OPENALEX_MAILTO, NCBI_API_KEY, S2_API_KEY. Nothing personal is sent unless you
set one of them yourself.
"""

from __future__ import annotations

import html
import json
import os
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass, field

USER_AGENT = "escape-velocity-scout/0.1 (https://github.com/scape-velocity/escape-velocity)"
ATOM = {"a": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
SOURCES = ("openalex", "arxiv", "crossref", "pubmed", "trials", "s2")


@dataclass
class Work:
    source: str
    title: str
    year: int | None = None
    authors: list[str] = field(default_factory=list)
    venue: str = ""
    type: str = ""
    doi: str = ""
    arxiv: str = ""
    pmid: str = ""
    nct: str = ""
    url: str = ""
    cited_by: int | None = None
    abstract: str = ""
    extra: dict = field(default_factory=dict)

    @property
    def identifier(self) -> str:
        if self.doi.startswith("10.48550/arxiv.") and not self.arxiv:
            self.arxiv = self.doi.split("arxiv.", 1)[1]
        if self.arxiv and (not self.doi or self.doi.startswith("10.48550/")):
            return f"arxiv:{self.arxiv}"
        if self.doi:
            return f"doi:{self.doi}"
        if self.arxiv:
            return f"arxiv:{self.arxiv}"
        if self.pmid:
            return f"pmid:{self.pmid}"
        if self.nct:
            return self.nct
        return self.url

    def as_dict(self) -> dict:
        data = asdict(self)
        data["identifier"] = self.identifier
        return data


class FetchError(RuntimeError):
    pass


def fetch(url: str, params: dict | None = None, headers: dict | None = None, retries: int = 4, accept_404: bool = False) -> bytes | None:
    """GET with a polite User-Agent. Retries on 429 and 5xx, honouring Retry-After."""
    if params:
        url = f"{url}?{urllib.parse.urlencode({k: v for k, v in params.items() if v not in (None, '')})}"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **(headers or {})})
    delay = 2.0
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code == 404 and accept_404:
                return None
            if error.code in (429, 500, 502, 503, 504) and attempt < retries:
                wait = error.headers.get("Retry-After")
                time.sleep(float(wait) if wait and wait.isdigit() else delay)
                delay *= 2
                continue
            raise FetchError(f"{error.code} from {url.split('?')[0]}") from error
        except (urllib.error.URLError, TimeoutError) as error:
            if attempt < retries:
                time.sleep(delay)
                delay *= 2
                continue
            raise FetchError(f"{error} for {url.split('?')[0]}") from error
    return None


def fetch_json(url: str, params: dict | None = None, headers: dict | None = None, accept_404: bool = False):
    body = fetch(url, params, headers, accept_404=accept_404)
    return None if body is None else json.loads(body)


def strip_tags(text: str) -> str:
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", text or "", flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return " ".join(html.unescape(text).split())


def normalize(text: str) -> str:
    """Compact form for quote matching: NFKC, lowercase, LaTeX markup and every character that is
    not a letter, a digit or % removed, including spaces."""
    text = unicodedata.normalize("NFKC", strip_tags(text)).lower()
    text = re.sub(r"\\(mathrm|text|mathit|rm|it|bf)\b", "", text)
    return "".join(ch for ch in text if ch.isalnum() or ch == "%")


def bare_doi(value: str) -> str:
    value = value.strip()
    value = re.sub(r"^(https?://(dx\.)?doi\.org/|doi:)", "", value, flags=re.I)
    return value.lower()


def parse_identifier(value: str) -> tuple[str, str]:
    """Return (kind, id) for a DOI, arXiv id, PMID or NCT number."""
    value = value.strip()
    lowered = value.lower()
    if lowered.startswith(("10.", "doi:", "https://doi.org/", "http://doi.org/", "https://dx.doi.org/")):
        return "doi", bare_doi(value)
    if lowered.startswith("arxiv:") or re.match(r"^\d{4}\.\d{4,5}(v\d+)?$", value) or "arxiv.org/abs/" in lowered:
        return "arxiv", re.sub(r"^(arxiv:|https?://arxiv\.org/abs/)", "", value, flags=re.I)
    if lowered.startswith("pmid:") or value.isdigit():
        return "pmid", value.split(":")[-1]
    if lowered.startswith("nct"):
        return "nct", value.upper()
    raise ValueError(f"cannot tell what kind of identifier {value!r} is (use doi:, arxiv:, pmid: or NCT...)")


# OpenAlex -------------------------------------------------------------------------------------

def _openalex_params(extra: dict) -> dict:
    params = dict(extra)
    if os.environ.get("OPENALEX_API_KEY"):
        params["api_key"] = os.environ["OPENALEX_API_KEY"]
    if os.environ.get("OPENALEX_MAILTO"):
        params["mailto"] = os.environ["OPENALEX_MAILTO"]
    return params


def _inverted_to_text(index: dict | None) -> str:
    if not index:
        return ""
    positions = [(pos, word) for word, places in index.items() for pos in places]
    return " ".join(word for _, word in sorted(positions))


def _openalex_work(item: dict) -> Work:
    location = item.get("primary_location") or {}
    source = location.get("source") or {}
    ids = item.get("ids") or {}
    arxiv = ""
    landing = location.get("landing_page_url") or ""
    if "arxiv.org/abs/" in landing:
        arxiv = landing.rsplit("/", 1)[-1]
    pmid = (ids.get("pmid") or "").rsplit("/", 1)[-1]
    return Work(
        source="openalex",
        title=strip_tags(item.get("title") or item.get("display_name") or ""),
        year=item.get("publication_year"),
        authors=[a.get("author", {}).get("display_name", "") for a in item.get("authorships", [])],
        venue=source.get("display_name") or "",
        type=item.get("type") or "",
        doi=bare_doi(item.get("doi") or "") if item.get("doi") else "",
        arxiv=arxiv,
        pmid=pmid,
        url=item.get("id", ""),
        cited_by=item.get("cited_by_count"),
        abstract=_inverted_to_text(item.get("abstract_inverted_index")),
    )


def openalex_search(query: str, since: int | None, limit: int, fields: list[int] | None = None) -> list[Work]:
    filters = []
    if since:
        filters.append(f"from_publication_date:{since}-01-01")
    if fields:
        filters.append("primary_topic.field.id:" + "|".join(str(f) for f in fields))
    data = fetch_json(
        "https://api.openalex.org/works",
        _openalex_params({"search": query, "filter": ",".join(filters), "per-page": min(limit, 50)}),
    )
    return [_openalex_work(item) for item in data.get("results", [])]


def openalex_work(kind: str, identifier: str) -> Work | None:
    key = {"doi": f"doi:{identifier}", "pmid": f"pmid:{identifier}"}.get(kind)
    if key is None:
        return None
    data = fetch_json(f"https://api.openalex.org/works/{key}", _openalex_params({}), accept_404=True)
    return _openalex_work(data) if data else None


def openalex_count(query: str, since: int, until: int | None = None) -> dict[int, int]:
    filters = [f"title_and_abstract.search:{query}", f"from_publication_date:{since}-01-01"]
    if until:
        filters.append(f"to_publication_date:{until}-12-31")
    data = fetch_json(
        "https://api.openalex.org/works",
        _openalex_params({"filter": ",".join(filters), "group_by": "publication_year"}),
    )
    counts = {int(group["key"]): group["count"] for group in data.get("group_by", []) if str(group.get("key", "")).isdigit()}
    return dict(sorted(counts.items()))


# arXiv ----------------------------------------------------------------------------------------

_last_arxiv_call = 0.0


def _arxiv_entries(params: dict) -> list[Work]:
    # arXiv asks for one request every three seconds.
    global _last_arxiv_call
    wait = 3.0 - (time.monotonic() - _last_arxiv_call)
    if wait > 0:
        time.sleep(wait)
    try:
        body = fetch("https://export.arxiv.org/api/query", params, retries=3)
    finally:
        _last_arxiv_call = time.monotonic()
    root = ET.fromstring(body)
    works = []
    for entry in root.findall("a:entry", ATOM):
        raw_id = entry.findtext("a:id", "", ATOM)
        if "/abs/" not in raw_id:
            continue
        arxiv_id = re.sub(r"v\d+$", "", raw_id.rsplit("/abs/", 1)[-1])
        published = entry.findtext("a:published", "", ATOM)
        works.append(
            Work(
                source="arxiv",
                title=" ".join(entry.findtext("a:title", "", ATOM).split()),
                year=int(published[:4]) if published[:4].isdigit() else None,
                authors=[a.findtext("a:name", "", ATOM) for a in entry.findall("a:author", ATOM)],
                venue=entry.findtext("arxiv:journal_ref", "", ATOM) or "arXiv",
                type="preprint",
                doi=bare_doi(entry.findtext("arxiv:doi", "", ATOM) or ""),
                arxiv=arxiv_id,
                url=f"https://arxiv.org/abs/{arxiv_id}",
                abstract=" ".join(entry.findtext("a:summary", "", ATOM).split()),
                extra={"categories": [c.get("term") for c in entry.findall("a:category", ATOM)], "published": published[:10]},
            )
        )
    return works


def arxiv_search(query: str, since: int | None, limit: int, categories: list[str] | None = None) -> list[Work]:
    phrases = re.findall(r'"([^"]+)"', query)
    loose = re.sub(r'"[^"]+"', " ", query).split()
    words = " AND ".join([f'all:"{p}"' for p in phrases] + [f"all:{w}" for w in loose])
    if categories:
        words = f"({words}) AND ({' OR '.join(f'cat:{c}' for c in categories)})"
    works = _arxiv_entries({"search_query": words, "sortBy": "relevance", "max_results": min(limit * 3 if since else limit, 100)})
    if since:
        works = [w for w in works if (w.year or 0) >= since]
    return works[:limit]


def arxiv_work(identifier: str) -> Work | None:
    works = _arxiv_entries({"id_list": identifier})
    return works[0] if works else None


# Crossref -------------------------------------------------------------------------------------

def _crossref_years(item: dict) -> list[int]:
    years = []
    for key in ("issued", "published", "published-print", "published-online"):
        parts = (item.get(key) or {}).get("date-parts") or [[None]]
        if parts and parts[0] and parts[0][0]:
            years.append(int(parts[0][0]))
    return sorted(set(years))


def _crossref_work(item: dict) -> Work:
    years = _crossref_years(item)
    authors = []
    for author in item.get("author", []):
        if author.get("family"):
            authors.append(f"{author['family']}, {author.get('given', '')}".strip(", "))
        elif author.get("name"):
            authors.append(author["name"])
    issued = ((item.get("issued") or {}).get("date-parts") or [[None]])[0][0]
    return Work(
        source="crossref",
        title=strip_tags(" ".join(item.get("title") or [""])),
        year=int(issued) if issued else (years[0] if years else None),
        authors=authors,
        venue=" ".join(item.get("container-title") or []),
        type=item.get("type", ""),
        doi=bare_doi(item.get("DOI", "")),
        url=f"https://doi.org/{item.get('DOI', '')}",
        cited_by=item.get("is-referenced-by-count"),
        abstract=strip_tags(item.get("abstract", "")),
        extra={"years": years},
    )


def crossref_search(query: str, since: int | None, limit: int) -> list[Work]:
    params = {"query": query, "rows": min(limit, 50), "select": "DOI,title,author,issued,published,container-title,type,is-referenced-by-count"}
    if since:
        params["filter"] = f"from-pub-date:{since}"
    data = fetch_json("https://api.crossref.org/works", params)
    return [_crossref_work(item) for item in data.get("message", {}).get("items", [])]


def crossref_work(doi: str) -> Work | None:
    data = fetch_json(f"https://api.crossref.org/works/{urllib.parse.quote(doi)}", accept_404=True)
    return _crossref_work(data["message"]) if data else None


RETRACTING = ("retraction", "withdrawal", "removal")


def crossref_updates(doi: str) -> list[dict]:
    """Notices registered in Crossref as updating the DOI, including the Retraction Watch database
    Crossref has carried since September 2023. One dict per notice: type (retraction, withdrawal,
    removal, correction, erratum, expression_of_concern...), notice (its DOI), date and source."""
    data = fetch_json("https://api.crossref.org/works", {"filter": f"updates:{doi}", "rows": 100})
    notices = []
    for item in data.get("message", {}).get("items", []):
        for update in item.get("update-to", []):
            if str(update.get("DOI", "")).lower() != doi.lower():
                continue
            parts = ((update.get("updated") or {}).get("date-parts") or [[]])[0]
            notices.append({
                "type": str(update.get("type", "unknown")).lower(),
                "notice": item.get("DOI", "?"),
                "date": "-".join(f"{int(p):02d}" for p in parts if p) or "no date",
                "source": update.get("source", "publisher"),
            })
    return notices


# PubMed ---------------------------------------------------------------------------------------

def _ncbi(params: dict) -> dict:
    if os.environ.get("NCBI_API_KEY"):
        params = {**params, "api_key": os.environ["NCBI_API_KEY"]}
    params.setdefault("tool", "escape-velocity-scout")
    return params


def pubmed_search(query: str, since: int | None, limit: int) -> list[Work]:
    params = {"db": "pubmed", "term": query, "retmode": "json", "retmax": min(limit, 100), "sort": "relevance"}
    if since:
        params.update({"datetype": "pdat", "mindate": since, "maxdate": 3000})
    ids = fetch_json("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi", _ncbi(params))["esearchresult"].get("idlist", [])
    return pubmed_summaries(ids)


def pubmed_summaries(ids: list[str]) -> list[Work]:
    if not ids:
        return []
    data = fetch_json("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi", _ncbi({"db": "pubmed", "id": ",".join(ids), "retmode": "json"}))
    works = []
    for pmid in ids:
        item = data.get("result", {}).get(pmid)
        if not item:
            continue
        doi = next((a["value"] for a in item.get("articleids", []) if a.get("idtype") == "doi"), "")
        year = re.match(r"\d{4}", item.get("pubdate", ""))
        works.append(
            Work(
                source="pubmed",
                title=strip_tags(item.get("title", "")),
                year=int(year.group()) if year else None,
                authors=[a.get("name", "") for a in item.get("authors", [])],
                venue=item.get("fulljournalname") or item.get("source", ""),
                type=", ".join(item.get("pubtype", [])),
                doi=bare_doi(doi) if doi else "",
                pmid=pmid,
                url=f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            )
        )
    return works


def pubmed_abstract(pmid: str) -> str:
    body = fetch("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi", _ncbi({"db": "pubmed", "id": pmid, "retmode": "xml"}))
    root = ET.fromstring(body)
    parts = []
    for node in root.iter("AbstractText"):
        text = "".join(node.itertext()).strip()
        label = node.get("Label")
        parts.append(f"{label}: {text}" if label else text)
    return " ".join(parts)


def pubmed_by_doi(doi: str) -> str | None:
    ids = fetch_json(
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi", _ncbi({"db": "pubmed", "term": f"{doi}[doi]", "retmode": "json"})
    )["esearchresult"].get("idlist", [])
    return ids[0] if len(ids) == 1 else None


# ClinicalTrials.gov ---------------------------------------------------------------------------

def _trial_work(study: dict) -> Work:
    protocol = study.get("protocolSection", {})
    ident = protocol.get("identificationModule", {})
    status = protocol.get("statusModule", {})
    design = protocol.get("designModule", {})
    sponsor = protocol.get("sponsorCollaboratorsModule", {}).get("leadSponsor", {})
    start = (status.get("startDateStruct") or {}).get("date", "")
    nct = ident.get("nctId", "")
    return Work(
        source="trials",
        title=ident.get("officialTitle") or ident.get("briefTitle", ""),
        year=int(start[:4]) if start[:4].isdigit() else None,
        authors=[sponsor.get("name", "")] if sponsor.get("name") else [],
        venue="ClinicalTrials.gov",
        type="trial",
        nct=nct,
        url=f"https://clinicaltrials.gov/study/{nct}",
        abstract=protocol.get("descriptionModule", {}).get("briefSummary", ""),
        extra={
            "status": status.get("overallStatus", ""),
            "phases": design.get("phases", []),
            "enrollment": (design.get("enrollmentInfo") or {}).get("count"),
            "start": start,
        },
    )


def trials_search(query: str, since: int | None, limit: int) -> list[Work]:
    term = query if '"' in query or " " not in query else f'"{query}"'
    params = {"query.term": term, "pageSize": min(limit, 100), "format": "json", "sort": "@relevance"}
    if since:
        params["filter.advanced"] = f"AREA[StartDate]RANGE[{since}-01-01,MAX]"
    data = fetch_json("https://clinicaltrials.gov/api/v2/studies", params)
    return [_trial_work(study) for study in data.get("studies", [])]


def trial_work(nct: str) -> Work | None:
    data = fetch_json(f"https://clinicaltrials.gov/api/v2/studies/{nct}", {"format": "json"}, accept_404=True)
    return _trial_work(data) if data else None


# Semantic Scholar -----------------------------------------------------------------------------

S2_FIELDS = "title,year,venue,externalIds,citationCount,authors,abstract,publicationTypes"


def _s2_headers() -> dict:
    return {"x-api-key": os.environ["S2_API_KEY"]} if os.environ.get("S2_API_KEY") else {}


def _s2_work(item: dict) -> Work:
    ids = item.get("externalIds") or {}
    return Work(
        source="s2",
        title=item.get("title") or "",
        year=item.get("year"),
        authors=[a.get("name", "") for a in item.get("authors", [])],
        venue=item.get("venue") or "",
        type=", ".join(item.get("publicationTypes") or []),
        doi=bare_doi(ids.get("DOI", "")) if ids.get("DOI") else "",
        arxiv=ids.get("ArXiv", "") or "",
        pmid=str(ids.get("PubMed", "") or ""),
        url=f"https://www.semanticscholar.org/paper/{item.get('paperId', '')}",
        cited_by=item.get("citationCount"),
        abstract=item.get("abstract") or "",
    )


def s2_search(query: str, since: int | None, limit: int) -> list[Work]:
    params = {"query": query, "limit": min(limit, 100), "fields": S2_FIELDS, "year": f"{since}-" if since else None}
    data = fetch_json("https://api.semanticscholar.org/graph/v1/paper/search", params, _s2_headers())
    return [_s2_work(item) for item in data.get("data", [])]


def s2_work(kind: str, identifier: str) -> Work | None:
    prefix = {"doi": "DOI", "arxiv": "ARXIV", "pmid": "PMID"}.get(kind)
    if prefix is None:
        return None
    data = fetch_json(
        f"https://api.semanticscholar.org/graph/v1/paper/{prefix}:{identifier}", {"fields": S2_FIELDS}, _s2_headers(), accept_404=True
    )
    return _s2_work(data) if data else None


# Dispatch -------------------------------------------------------------------------------------

def search(source: str, query: str, since: int | None = None, limit: int = 10, categories: list[str] | None = None,
           fields: list[int] | None = None) -> list[Work]:
    if source == "openalex":
        return openalex_search(query, since, limit, fields)
    if source == "arxiv":
        return arxiv_search(query, since, limit, categories)
    if source == "crossref":
        return crossref_search(query, since, limit)
    if source == "pubmed":
        return pubmed_search(query, since, limit)
    if source == "trials":
        return trials_search(query, since, limit)
    if source == "s2":
        return s2_search(query, since, limit)
    raise ValueError(f"unknown source {source!r}; use one of {', '.join(SOURCES)}")


def lookup(identifier: str) -> tuple[Work | None, list[str]]:
    """Find a work and its abstract, trying each source in turn. Returns the work (with the best
    abstract found) and the list of sources that answered."""
    kind, value = parse_identifier(identifier)
    tried: list[str] = []
    if kind == "nct":
        work = trial_work(value)
        return work, ["trials"] if work else []
    if kind == "arxiv":
        try:
            work = arxiv_work(value)
        except FetchError:
            work = None
        if work:
            return work, ["arxiv"]
        # arXiv rate-limits hard; OpenAlex and Semantic Scholar index arXiv too.
        for name, getter in (
            ("openalex", lambda: openalex_work("doi", f"10.48550/arxiv.{value}")),
            ("s2", lambda: s2_work("arxiv", value)),
        ):
            try:
                found = getter()
            except FetchError:
                found = None
            if found and found.abstract:
                found.arxiv = value
                found.extra["abstract_from"] = name
                return found, [name]
        return None, tried
    work = None
    for name, getter in (
        ("openalex", lambda: openalex_work(kind, value)),
        ("crossref", lambda: crossref_work(value) if kind == "doi" else None),
        ("s2", lambda: s2_work(kind, value)),
    ):
        try:
            found = getter()
        except FetchError:
            found = None
        if found is None:
            continue
        tried.append(name)
        if work is None:
            work = found
        if found.abstract and not work.abstract:
            work.abstract = found.abstract
            work.extra["abstract_from"] = name
        if work.abstract:
            break
    if work is not None and not work.abstract:
        pmid = value if kind == "pmid" else (work.pmid or (pubmed_by_doi(value) if kind == "doi" else None))
        if pmid:
            work.abstract = pubmed_abstract(pmid)
            work.pmid = pmid
            tried.append("pubmed")
            work.extra["abstract_from"] = "pubmed"
    elif work is not None:
        work.extra.setdefault("abstract_from", work.source)
    return work, tried
