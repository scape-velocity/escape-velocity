"""Check evidence cards against their sources.

    python3 skills/review-evidence/scripts/verify_evidence.py                 # every unverified card
    python3 skills/review-evidence/scripts/verify_evidence.py google2024quantum --show-abstract
    python3 skills/review-evidence/scripts/verify_evidence.py --all --write

For each card: the identifier resolves (Crossref, arXiv, PubMed, ClinicalTrials.gov or the URL);
the title, the year and the first author match the source; every finding's quote appears in the
abstract, or in the page text for a source cited by URL. Matching ignores case, spacing,
punctuation and LaTeX markup.

A number in the finding that cannot be found in its quote, at any power of ten, is a warning: the
conversion may be right (0.143% is 1.43e-3) and a curator confirms it.

--write sets status = "machine-checked" and checked = today on every card that passes. It never
touches a card a curator has verified or rejected, and it never marks a card verified.
"""

from __future__ import annotations

import argparse
import datetime as dt
import difflib
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools"))

import atlas  # noqa: E402
import literature  # noqa: E402

NUMBER = re.compile(r"(?<![\w.])[-−]?\d+(?:[ ,]\d{3})*(?:\.\d+)?")


def similar(a: str, b: str) -> bool:
    a, b = literature.normalize(a), literature.normalize(b)
    if not a or not b:
        return False
    return a in b or b in a or difflib.SequenceMatcher(None, a, b).ratio() >= 0.85


def numbers_in(text: str) -> list[float]:
    found = []
    for match in NUMBER.findall(text):
        cleaned = match.replace("−", "-").replace(",", "").replace(" ", "")
        try:
            found.append(float(cleaned))
        except ValueError:
            pass
    return found


def value_in_quote(value, quote: str) -> bool:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return True
    if value == 0:
        return "0" in quote
    for number in numbers_in(quote):
        if number == 0:
            continue
        ratio = abs(value / number)
        exponent = round(math.log10(ratio))
        if abs(exponent) <= 15 and math.isclose(ratio, 10.0**exponent, rel_tol=2e-3):
            return True
    return False


def source_metadata(card: dict) -> tuple[str, literature.Work | None, list[int], str]:
    """Return (identifier, work with metadata, accepted years, text to search quotes in)."""
    if card.get("doi"):
        doi = literature.bare_doi(card["doi"])
        identifier = f"doi:{doi}"
        work = literature.crossref_work(doi)
        years = list(work.extra.get("years", [])) if work else []
        found, _ = literature.lookup(identifier)
        if work is None:
            work = found
        if found and found.year:
            years.append(found.year)
        text = (found.abstract if found else "") or (work.abstract if work else "")
        return identifier, work, sorted(set(years)), text
    if card.get("arxiv"):
        identifier = f"arxiv:{card['arxiv']}"
        work, _ = literature.lookup(identifier)
        years = [work.year] if work and work.year else []
        if work and work.extra.get("published"):
            years.append(int(work.extra["published"][:4]))
        return identifier, work, sorted(set(years)), work.abstract if work else ""
    if card.get("pmid"):
        identifier = f"pmid:{card['pmid']}"
        works = literature.pubmed_summaries([str(card["pmid"])])
        work = works[0] if works else None
        return identifier, work, [work.year] if work and work.year else [], literature.pubmed_abstract(str(card["pmid"])) if work else ""
    if card.get("nct"):
        identifier = card["nct"]
        work = literature.trial_work(card["nct"])
        return identifier, work, [work.year] if work and work.year else [], work.abstract if work else ""
    if card.get("url"):
        body = literature.fetch(card["url"], accept_404=True)
        text = literature.strip_tags(body.decode("utf-8", "replace")) if body else ""
        return card["url"], None, [], text
    return "", None, [], ""


def check_card(key: str, card: dict, show_abstract: bool) -> tuple[list[str], list[str]]:
    failures: list[str] = []
    warnings: list[str] = []
    try:
        identifier, work, years, text = source_metadata(card)
    except literature.FetchError as error:
        return [f"could not reach the source: {error}"], []
    if not identifier:
        return ["has no identifier"], []
    if card.get("url") and not any(card.get(k) for k in ("doi", "arxiv", "pmid", "nct")):
        if not text:
            failures.append(f"{identifier} did not return a page")
        elif not similar(card.get("title", ""), text):
            warnings.append("the title does not appear on the page")
    elif work is None:
        failures.append(f"{identifier} does not resolve")
    else:
        if not similar(card.get("title", ""), work.title):
            failures.append(f"title differs from the source: {work.title!r}")
        if years and card.get("year") not in years:
            failures.append(f"year {card.get('year')} is not among the source's dates {years}")
        authors = card.get("authors") or []
        if authors and work.authors:
            family = literature.normalize(authors[0].split(",")[0])
            if family not in literature.normalize(" ".join(work.authors[:3])):
                failures.append(f"first author {authors[0]!r} is not among the source's first authors {work.authors[:3]}")
        elif authors and not work.authors:
            warnings.append("the source lists no authors; first author not checked")
    if show_abstract:
        print(f"\n--- text from {identifier} ---\n{text or '(none)'}\n---")
    normalized = literature.normalize(text)
    for index, finding in enumerate(card.get("finding", []), 1):
        quote = str(finding.get("quote", "")).strip()
        if not quote:
            failures.append(f"finding {index} has no quote")
            continue
        if not normalized:
            failures.append(f"finding {index}: no abstract or page text to check the quote against; a curator must verify it")
            continue
        if literature.normalize(quote) not in normalized:
            failures.append(f"finding {index}: quote not found in the {'page' if card.get('url') and not card.get('doi') else 'abstract'}")
        if not value_in_quote(finding.get("value"), quote):
            warnings.append(f"finding {index}: value {finding.get('value')} does not appear in the quote at any power of ten")
    return failures, warnings


def mark_checked(path: Path, today: dt.date) -> None:
    lines = path.read_text(encoding="utf-8").split("\n")
    end = next((i for i, line in enumerate(lines) if line.startswith("[")), len(lines))
    status_at = None
    checked_at = None
    for i in range(end):
        if re.match(r"^status\s*=", lines[i]):
            status_at = i
        if re.match(r"^#?\s*checked\s*=", lines[i]):
            checked_at = i
    if status_at is None:
        raise ValueError(f"{path.name} has no top-level status line")
    lines[status_at] = 'status = "machine-checked"'
    if checked_at is not None:
        lines[checked_at] = f"checked = {today.isoformat()}"
    else:
        lines.insert(status_at + 1, f"checked = {today.isoformat()}")
    path.write_text("\n".join(lines), encoding="utf-8")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("keys", nargs="*", help="card keys; default every unverified card")
    parser.add_argument("--all", action="store_true", help="unverified and machine-checked cards")
    parser.add_argument("--write", action="store_true", help="mark passing cards machine-checked")
    parser.add_argument("--show-abstract", action="store_true", help="print the text the quotes are checked against")
    args = parser.parse_args(argv)

    cards = atlas.evidence()
    if args.keys:
        missing = [k for k in args.keys if k not in cards]
        if missing:
            print(f"error: not in evidence/: {', '.join(missing)}", file=sys.stderr)
            return 1
        selected = args.keys
    else:
        wanted = {"unverified", "machine-checked"} if args.all else {"unverified"}
        selected = [k for k, (_, card) in cards.items() if card.get("status") in wanted]
    today = dt.date.today()
    failed = 0
    for key in selected:
        path, card = cards[key]
        failures, warnings = check_card(key, card, args.show_abstract)
        verdict = "FAIL" if failures else "ok"
        print(f"{verdict:<4} {key}")
        for failure in failures:
            print(f"     error: {failure}")
        for warning in warnings:
            print(f"     warning: {warning}")
        if failures:
            failed += 1
        elif args.write and card.get("status") in ("unverified", "machine-checked"):
            mark_checked(path, today)
            print(f"     marked machine-checked on {today}")
    print(f"\n{len(selected) - failed} of {len(selected)} cards pass.")
    if args.write:
        print("Run python3 tools/generate.py so the pages show the new status.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
