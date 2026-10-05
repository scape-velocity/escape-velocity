"""Search the open literature for work that could close a gap in the atlas.

    python3 skills/scout-literature/scripts/search.py search "surface code decoder latency" --since 2024
    python3 skills/scout-literature/scripts/search.py search --tech quantum/fault-tolerant-quantum-computer --since 2025
    python3 skills/scout-literature/scripts/search.py abstract doi:10.1038/s41586-024-08449-y
    python3 skills/scout-literature/scripts/search.py count "nitrogenase cereal" --from 2010

search    prints one line per result: source, year, citations, identifier, title, first author, venue.
          Results already in evidence/ are marked [in atlas]. --json prints everything, abstracts included.
          With --tech, the queries come from the technology's search_terms and the search_terms of its
          open gaps, and the sources from its domain (arXiv categories, PubMed for life sciences,
          ClinicalTrials.gov for health and neurotech).
abstract  prints the metadata and the abstract of one work, trying OpenAlex, Crossref, Semantic
          Scholar and PubMed in turn.
count     prints works per year whose title or abstract match, from OpenAlex: the input for spotting
          neglected gaps.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools"))

import atlas  # noqa: E402
import literature  # noqa: E402

SCOUTED_GAP_TYPES = {"scientific-unknown", "engineering", "fundamental-limit", "data"}


def known_identifiers() -> set[str]:
    found = set()
    for _, card in atlas.evidence().values():
        if card.get("doi"):
            found.add(f"doi:{literature.bare_doi(card['doi'])}")
        if card.get("arxiv"):
            found.add(f"arxiv:{card['arxiv']}")
        if card.get("pmid"):
            found.add(f"pmid:{card['pmid']}")
        if card.get("nct"):
            found.add(card["nct"])
    return found


def plan_for_technology(tech_id: str) -> tuple[list[tuple[str, str]], list[str], list[str]]:
    """Return [(label, query)], the sources and the arXiv categories for one technology."""
    techs = atlas.technologies()
    if tech_id not in techs:
        raise SystemExit(f"{tech_id!r} is not in atlas/; ids are <domain>/<slug>")
    tech = techs[tech_id]
    domain = atlas.taxonomy().domains.get(tech.domain, {})
    queries = [("technology", term) for term in tech.data.get("search_terms", [])]
    for gap in tech.gaps():
        if gap.get("status") in ("closed",) or gap.get("type") not in SCOUTED_GAP_TYPES:
            continue
        for term in gap.get("search_terms", []):
            queries.append((f"gap {gap.get('id')}", term))
    categories = tech.data.get("arxiv") or domain.get("arxiv", [])
    sources = ["openalex"]
    if categories:
        sources.append("arxiv")
    if domain.get("pubmed"):
        sources.append("pubmed")
    if tech.domain in ("health", "neurotech"):
        sources.append("trials")
    if not queries:
        raise SystemExit(f"{tech_id} has no search_terms, in the technology or in its open gaps")
    return queries, sources, categories


def line(work: literature.Work, known: set[str]) -> str:
    first = work.authors[0] if work.authors else "?"
    if len(work.authors) > 1:
        first += " et al."
    cites = f"{work.cited_by:>5}" if work.cited_by is not None else "    -"
    mark = " [in atlas]" if work.identifier in known else ""
    extra = ""
    if work.source == "trials":
        extra = f" | {work.extra.get('status', '')} {'/'.join(work.extra.get('phases') or [])} n={work.extra.get('enrollment')}"
    return f"{work.source:<8} {work.year or '----'} {cites}  {work.identifier}{mark}\n         {work.title} | {first} | {work.venue}{extra}"


def command_search(args) -> int:
    known = known_identifiers()
    if args.tech:
        queries, sources, categories = plan_for_technology(args.tech)
        if args.source:
            sources = args.source
        categories = args.arxiv_cat or categories
    else:
        if not args.query:
            raise SystemExit("give a query, or --tech <domain>/<slug>")
        queries = [("query", args.query)]
        sources = args.source or ["openalex", "arxiv"]
        categories = args.arxiv_cat or []
    seen: set[str] = set()
    results = []
    failures = []
    for label, query in queries:
        for source in sources:
            try:
                works = literature.search(source, query, args.since, args.limit, categories, args.field)
            except literature.FetchError as error:
                failures.append(f"{source} for {query!r}: {error}")
                continue
            for work in works:
                key = work.identifier or work.title.lower()
                if key in seen:
                    continue
                seen.add(key)
                results.append((label, query, work))
    if args.json:
        print(json.dumps([{"label": label, "query": query, **work.as_dict()} for label, query, work in results], indent=1, ensure_ascii=False))
    else:
        current = None
        for label, query, work in results:
            if (label, query) != current:
                current = (label, query)
                print(f"\n## {label}: {query}")
            print(line(work, known))
        print(f"\n{len(results)} results; {sum(1 for _, _, w in results if w.identifier in known)} already in the atlas.")
    for failure in failures:
        print(f"warning: {failure}", file=sys.stderr)
    return 0 if results or not failures else 1


def command_abstract(args) -> int:
    work, sources = literature.lookup(args.identifier)
    if work is None:
        print(f"not found: {args.identifier}", file=sys.stderr)
        return 1
    if args.json:
        print(json.dumps({**work.as_dict(), "sources": sources}, indent=1, ensure_ascii=False))
        return 0
    years = work.extra.get("years")
    print(f"title:    {work.title}")
    print(f"authors:  {'; '.join(work.authors[:8])}{' ...' if len(work.authors) > 8 else ''}")
    print(f"year:     {work.year}{' (Crossref dates: ' + ', '.join(map(str, years)) + ')' if years and len(years) > 1 else ''}")
    print(f"venue:    {work.venue}")
    print(f"type:     {work.type}")
    print(f"ids:      {' '.join(x for x in (work.doi and 'doi:' + work.doi, work.arxiv and 'arxiv:' + work.arxiv, work.pmid and 'pmid:' + work.pmid, work.nct) if x)}")
    print(f"answered: {', '.join(sources)}; abstract from {work.extra.get('abstract_from', work.source) if work.abstract else 'nowhere'}")
    print()
    print(work.abstract or "(no abstract available from the open APIs; read the source)")
    return 0


def command_count(args) -> int:
    counts = literature.openalex_count(args.query, args.since, args.until)
    if args.json:
        print(json.dumps(counts))
        return 0
    if not counts:
        print("no works found")
        return 0
    top = max(counts.values())
    for year, count in counts.items():
        print(f"{year}  {count:>7}  {'#' * max(1, round(40 * count / top)) if count else ''}")
    years = sorted(counts)
    if len(years) >= 4:
        early = sum(counts[y] for y in years[: len(years) // 2]) / (len(years) // 2)
        late = sum(counts[y] for y in years[len(years) // 2 :]) / (len(years) - len(years) // 2)
        if early:
            print(f"\nmean per year, second half over first half: {late / early:.2f}")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    search = sub.add_parser("search", help="search one or more sources")
    search.add_argument("query", nargs="?")
    search.add_argument("--tech", help="take queries and sources from atlas/<domain>/<slug>.toml")
    search.add_argument("--source", action="append", choices=literature.SOURCES, help="repeat for several; default openalex and arxiv")
    search.add_argument("--since", type=int, help="publication year from")
    search.add_argument("--limit", type=int, default=8, help="results per query and source")
    search.add_argument("--arxiv-cat", action="append", help="arXiv category, such as quant-ph; repeat for several")
    search.add_argument("--field", action="append", type=int, help="OpenAlex field id; see taxonomy/domains.toml")
    search.add_argument("--json", action="store_true")
    search.set_defaults(handler=command_search)

    abstract = sub.add_parser("abstract", help="metadata and abstract of one work")
    abstract.add_argument("identifier", help="doi:..., arxiv:..., pmid:... or NCT...")
    abstract.add_argument("--json", action="store_true")
    abstract.set_defaults(handler=command_abstract)

    count = sub.add_parser("count", help="works per year in OpenAlex")
    count.add_argument("query")
    count.add_argument("--from", dest="since", type=int, default=2010)
    count.add_argument("--to", dest="until", type=int)
    count.add_argument("--json", action="store_true")
    count.set_defaults(handler=command_count)

    args = parser.parse_args(argv)
    try:
        return args.handler(args)
    except literature.FetchError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
