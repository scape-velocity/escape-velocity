"""Validate the atlas. Run it before every pull request; CI runs it too.

    python3 tools/check.py

Errors (exit 1): values outside the taxonomy, missing required fields for a technology's status,
references to technologies or evidence cards that do not exist, dependency cycles, evidence cards
that break the key convention, people named by something other than a GitHub handle, a card
verified by the person who added it, generated pages out of date.
Warnings (exit 0): reviews past due, current values older than two years, a current value that
differs from its evidence card, evidence cards nothing cites, a card verified by someone who no
longer curates or moderates any technology that cites it.
"""

from __future__ import annotations

import datetime as dt
import math
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import atlas  # noqa: E402
import generate  # noqa: E402

ID = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
EVIDENCE_KEY = re.compile(r"^[a-z]+(\d{4})[a-z]+$")
TECHNOLOGY_KEYS = {
    "name", "statement", "scope", "status", "readiness", "readiness_scale", "readiness_evidence",
    "readiness_note", "horizon", "sdgs", "openalex_topics", "arxiv", "search_terms", "curators",
    "last_reviewed", "alan_machine", "retired_reason", "requires", "metric", "gap",
}
METRIC_KEYS = {"id", "metric", "headline", "conditions", "current", "target", "limit", "history"}
GAP_KEYS = {"id", "title", "description", "metric", "type", "layer", "severity", "status", "blocked_by", "evidence", "search_terms", "approach"}
REQUIRES_KEYS = {"technology", "why", "metric", "value", "need"}
EVIDENCE_KEYS = {
    "title", "authors", "year", "venue", "type", "doi", "arxiv", "pmid", "nct", "url", "accessed",
    "class", "status", "added", "added_by", "checked", "reviewed_by", "note", "finding",
}
FINDING_KEYS = {"metric", "value", "unit", "conditions", "quote", "note"}
GOVERNANCE_KEYS = {"maintainers"}
MAX_QUOTE_WORDS = 60


class Report:
    def __init__(self):
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, where: str, message: str):
        self.errors.append(f"{where}: {message}")

    def warn(self, where: str, message: str):
        self.warnings.append(f"{where}: {message}")


def is_number(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def check_people(where: str, field_name: str, value, report: Report):
    """A list of GitHub handles, without @, each once."""
    if not isinstance(value, list):
        report.error(where, f"{field_name} must be a list of GitHub handles")
        return
    seen = set()
    for person in value:
        if not isinstance(person, str) or not atlas.GITHUB_HANDLE.match(person):
            report.error(where, f"{field_name}: {person!r} is not a GitHub handle (write it without @)")
        elif person.lower() in seen:
            report.error(where, f"{field_name}: {person!r} is listed twice")
        else:
            seen.add(person.lower())


def check_governance(report: Report) -> list[str]:
    where = "governance.toml"
    path = atlas.ROOT / where
    if not path.exists():
        report.error(where, "is missing; it lists the maintainers (GOVERNANCE.md)")
        return []
    data = atlas._load_or_record(path)
    if data is None:
        return []
    for field_name in set(data) - GOVERNANCE_KEYS:
        report.error(where, f"unknown field {field_name!r}")
    people = data.get("maintainers", [])
    check_people(where, "maintainers", people, report)
    if not people:
        report.error(where, "needs at least one maintainer")
    return [p for p in people if isinstance(p, str)] if isinstance(people, list) else []


def check_taxonomy(tax: atlas.Taxonomy, report: Report):
    for domain_id, domain in tax.domains.items():
        where = f"taxonomy/domains.toml [{domain_id}]"
        if not ID.match(domain_id):
            report.error(where, "id must be lowercase words joined by hyphens")
        if domain.get("readiness_scale") not in tax.scales:
            report.error(where, f"unknown readiness scale {domain.get('readiness_scale')!r}")
        for sdg in domain.get("sdgs", []):
            if sdg not in tax.sdgs:
                report.error(where, f"unknown SDG {sdg!r}")
        check_people(where, "moderators", domain.get("moderators", []), report)
    for metric_id, metric in tax.metrics.items():
        where = f"taxonomy/metrics.toml [{metric_id}]"
        if not ID.match(metric_id):
            report.error(where, "id must be lowercase words joined by hyphens")
        if metric.get("direction") not in ("lower", "higher"):
            report.error(where, "direction must be 'lower' or 'higher'")
        if metric.get("scale") not in ("log", "linear"):
            report.error(where, "scale must be 'log' or 'linear'")
        for required in ("name", "meaning", "unit"):
            if not str(metric.get(required, "")).strip():
                report.error(where, f"has no {required}")
    for scale_id, scale in tax.scales.items():
        levels = [item.get("level") for item in scale.get("level", [])]
        if levels != list(range(1, len(levels) + 1)):
            report.error(f"taxonomy/readiness-scales.toml [{scale_id}]", "levels must be 1, 2, 3... in order")


def check_value_table(where: str, part: str, table, report: Report, cards: dict, metric_id: str | None):
    if not isinstance(table, dict):
        report.error(where, f"{part} must be a table")
        return
    if not is_number(table.get("value")):
        report.error(where, f"{part}.value must be a number")
    if part in ("current", "history"):
        if atlas.as_date(table.get("as_of")) is None:
            report.error(where, f"{part}.as_of must be a date (YYYY-MM-DD)")
        if not table.get("evidence"):
            report.error(where, f"{part} needs an evidence card")
    if part == "target" and not str(table.get("rationale", "")).strip():
        report.error(where, "target needs a rationale: who set it, or why this value")
    if part == "limit" and not str(table.get("basis", "")).strip():
        report.error(where, "limit needs a basis: which law, under which assumptions")
    key = table.get("evidence")
    if key:
        if key not in cards:
            report.error(where, f"{part} cites {key!r}, which is not in evidence/")
        elif part in ("current", "history") and metric_id:
            findings = [f for f in cards[key][1].get("finding", []) if f.get("metric") == metric_id]
            if not findings:
                report.error(where, f"{part} cites {key!r}, which has no finding for metric {metric_id!r}")
            elif is_number(table.get("value")) and not any(
                is_number(f.get("value")) and math.isclose(f["value"], table["value"], rel_tol=1e-9) for f in findings
            ):
                report.warn(where, f"{part} value {table.get('value')} differs from every {metric_id!r} finding in {key!r}")


def check_technology(tech: atlas.Technology, ctx: generate.Context, report: Report, today: dt.date):
    tax = ctx.tax
    data = tech.data
    where = f"atlas/{tech.domain}/{tech.slug}.toml"
    if tech.domain not in tax.domains:
        report.error(where, f"folder {tech.domain!r} is not a domain in taxonomy/domains.toml")
    if not ID.match(tech.slug):
        report.error(where, "file name must be lowercase words joined by hyphens")
    for key in set(data) - TECHNOLOGY_KEYS:
        report.error(where, f"unknown field {key!r}")
    for required in ("name", "statement", "status"):
        if not str(data.get(required, "")).strip():
            report.error(where, f"has no {required}")
    status = data.get("status")
    if status not in tax.allowed("technology_status"):
        report.error(where, f"status {status!r} is not one of {', '.join(sorted(tax.allowed('technology_status')))}")

    scale = tax.scale_of(tech)
    if data.get("readiness_scale") and data["readiness_scale"] not in tax.scales:
        report.error(where, f"unknown readiness scale {data['readiness_scale']!r}")
    top = len(scale.get("level", [])) if scale else 0

    def check_level(level, label):
        if level is not None and (not isinstance(level, int) or isinstance(level, bool) or not 1 <= level <= top):
            report.error(where, f"{label} must be a level from 1 to {top} on {scale.get('id') if scale else '?'}")

    check_level(data.get("readiness"), "readiness")
    for key in data.get("readiness_evidence", []):
        if key not in ctx.cards:
            report.error(where, f"readiness_evidence cites {key!r}, which is not in evidence/")
    for sdg in data.get("sdgs", []):
        if sdg not in tax.sdgs:
            report.error(where, f"unknown SDG {sdg!r}")
    if "last_reviewed" in data and atlas.as_date(data["last_reviewed"]) is None:
        report.error(where, "last_reviewed must be a date (YYYY-MM-DD)")
    for item in data.get("alan_machine", []):
        if not isinstance(item, dict) or not item.get("page") or not item.get("title"):
            report.error(where, "alan_machine entries are { page = \"chapters/<slug>\", title = \"...\" }")

    for requirement in tech.requires():
        for key in set(requirement) - REQUIRES_KEYS:
            report.error(where, f"requires: unknown field {key!r}")
        dep = requirement.get("technology")
        if dep not in ctx.techs:
            report.error(where, f"requires {dep!r}, which is not in atlas/ (add it, as proposed if need be)")
        elif dep == tech.id:
            report.error(where, "requires itself")
        if not str(requirement.get("why", "")).strip():
            report.error(where, f"requires {dep!r} without saying why")
        if requirement.get("metric") and requirement["metric"] not in tax.metrics:
            report.error(where, f"requires {dep!r}: unknown metric {requirement['metric']!r}")
        if "value" in requirement and not is_number(requirement["value"]):
            report.error(where, f"requires {dep!r}: value must be a number")
    required_ids = {r.get("technology") for r in tech.requires()}

    metric_ids = set()
    headlines = 0
    for metric in tech.metrics():
        mwhere = f"{where} metric {metric.get('id')!r}"
        for key in set(metric) - METRIC_KEYS:
            report.error(mwhere, f"unknown field {key!r}")
        if not ID.match(str(metric.get("id", ""))):
            report.error(mwhere, "id must be lowercase words joined by hyphens")
        if metric.get("id") in metric_ids:
            report.error(mwhere, "duplicate id")
        metric_ids.add(metric.get("id"))
        metric_id = metric.get("metric")
        if metric_id not in tax.metrics:
            report.error(mwhere, f"unknown metric {metric_id!r} (add it to taxonomy/metrics.toml)")
        headlines += bool(metric.get("headline"))
        for part in ("current", "target", "limit"):
            if part in metric:
                check_value_table(mwhere, part, metric[part], report, ctx.cards, metric_id)
        for entry in metric.get("history", []):
            check_value_table(mwhere, "history", entry, report, ctx.cards, metric_id)
        current = metric.get("current", {})
        as_of = atlas.as_date(current.get("as_of")) if isinstance(current, dict) else None
        if as_of and (today - as_of).days > 730:
            report.warn(mwhere, f"current value is from {as_of}; look for a newer one")
        definition = tax.metrics.get(metric_id, {})
        target = metric.get("target", {}).get("value") if isinstance(metric.get("target"), dict) else None
        limit = metric.get("limit", {}).get("value") if isinstance(metric.get("limit"), dict) else None
        if definition and is_number(target) and is_number(limit):
            room = atlas.headroom(definition, target, limit)
            beyond = [g for g in tech.gaps() if g.get("metric") == metric.get("id") and g.get("status") == "beyond-limit"]
            if room is not None and room < 0 and not beyond:
                report.error(mwhere, "target lies beyond the physical limit; add a gap with status 'beyond-limit' or change the target")
    if headlines > 1:
        report.error(where, "has more than one headline metric")

    gap_ids = set()
    for gap in tech.gaps():
        gwhere = f"{where} gap {gap.get('id')!r}"
        for key in set(gap) - GAP_KEYS:
            report.error(gwhere, f"unknown field {key!r}")
        if not ID.match(str(gap.get("id", ""))):
            report.error(gwhere, "id must be lowercase words joined by hyphens")
        if gap.get("id") in gap_ids:
            report.error(gwhere, "duplicate id")
        gap_ids.add(gap.get("id"))
        if not str(gap.get("title", "")).strip():
            report.error(gwhere, "has no title")
        for field_name, vocab in (("type", "gap_type"), ("layer", "layer"), ("severity", "severity"), ("status", "gap_status")):
            if gap.get(field_name) not in tax.allowed(vocab):
                report.error(gwhere, f"{field_name} {gap.get(field_name)!r} is not one of {', '.join(sorted(tax.allowed(vocab)))}")
        if gap.get("metric") and gap["metric"] not in metric_ids:
            report.error(gwhere, f"metric {gap['metric']!r} is not a metric id in this file")
        for blocker in gap.get("blocked_by", []):
            if blocker not in ctx.techs:
                report.error(gwhere, f"blocked_by {blocker!r}, which is not in atlas/")
            elif blocker not in required_ids:
                report.error(gwhere, f"blocked_by {blocker!r}, which is not in this technology's requires")
        for key in gap.get("evidence", []):
            if key not in ctx.cards:
                report.error(gwhere, f"cites {key!r}, which is not in evidence/")
        if gap.get("status") == "closed" and not any(
            key in ctx.cards and ctx.cards[key][1].get("class") == "established" for key in gap.get("evidence", [])
        ):
            report.error(gwhere, "status 'closed' needs an established evidence card in evidence")
        for approach in gap.get("approach", []):
            if not str(approach.get("name", "")).strip():
                report.error(gwhere, "an approach has no name")
            check_level(approach.get("readiness"), f"approach {approach.get('name')!r} readiness")
            for key in approach.get("evidence", []):
                if key not in ctx.cards:
                    report.error(gwhere, f"approach {approach.get('name')!r} cites {key!r}, which is not in evidence/")

    # What each status requires.
    headline = tech.headline()
    if status in ("scoping", "mapped", "tracked", "achieved"):
        if headline is None:
            report.error(where, f"a {status} technology needs a headline metric")
        else:
            if "current" not in headline:
                report.error(where, f"a {status} technology needs a current value for its headline metric")
            if "target" not in headline:
                report.error(where, f"a {status} technology needs a target for its headline metric")
        if "last_reviewed" not in data:
            report.error(where, f"a {status} technology needs last_reviewed")
    if status in ("mapped", "tracked", "achieved"):
        for metric in tech.metrics():
            for part in ("current", "target"):
                if part not in metric:
                    report.error(where, f"a {status} technology needs {part} for metric {metric.get('id')!r}")
        if not tech.gaps() and status != "achieved":
            report.error(where, f"a {status} technology needs at least one gap")
        if data.get("readiness") is None or not data.get("readiness_evidence"):
            report.error(where, f"a {status} technology needs readiness with readiness_evidence")
    check_people(where, "curators", data.get("curators", []), report)
    if status == "tracked" and not data.get("curators"):
        report.error(where, "a tracked technology needs at least one curator")
    if status == "retired" and not str(data.get("retired_reason", "")).strip():
        report.error(where, "a retired technology needs retired_reason")

    last = atlas.as_date(data.get("last_reviewed"))
    if last:
        months = 6 if status == "tracked" else 12
        if status in ("scoping", "mapped", "tracked") and (today - last).days > months * 30.5:
            curators = data.get("curators") if isinstance(data.get("curators"), list) else []
            who = "; curators: " + ", ".join(f"@{c}" for c in curators) if curators else ""
            report.warn(where, f"last reviewed on {last}; a {status} technology is reviewed every {months} months{who}")


def check_cycles(ctx: generate.Context, report: Report):
    graph = {tech_id: [r.get("technology") for r in tech.requires() if r.get("technology") in ctx.techs]
             for tech_id, tech in ctx.techs.items()}
    state: dict[str, int] = {}

    def visit(node: str, path: list[str]):
        state[node] = 1
        for nxt in graph.get(node, []):
            if state.get(nxt) == 1:
                cycle = path[path.index(nxt):] + [nxt] if nxt in path else [node, nxt]
                report.error("atlas", "dependency cycle: " + " -> ".join(cycle))
            elif state.get(nxt) is None:
                visit(nxt, path + [nxt])
        state[node] = 2

    for node in graph:
        if state.get(node) is None:
            visit(node, [node])


def check_evidence(ctx: generate.Context, report: Report, maintainers: list[str]):
    tax = ctx.tax
    for key, (path, card) in ctx.cards.items():
        where = f"evidence/{path.name}"
        for field_name in set(card) - EVIDENCE_KEYS:
            report.error(where, f"unknown field {field_name!r}")
        match = EVIDENCE_KEY.match(key)
        if not match:
            report.error(where, "file name must be authorYEARfirstword, lowercase (for example google2024quantum)")
        elif card.get("year") != int(match.group(1)):
            report.error(where, f"the key has year {match.group(1)}, the card says {card.get('year')!r}")
        for required in ("title", "year", "type", "class", "status", "added", "added_by"):
            if card.get(required) in (None, ""):
                report.error(where, f"has no {required}")
        if not card.get("authors"):
            report.error(where, "has no authors (a list; an organization counts)")
        for field_name, vocab in (("type", "evidence_type"), ("class", "evidence_class"), ("status", "evidence_status")):
            if card.get(field_name) not in tax.allowed(vocab):
                report.error(where, f"{field_name} {card.get(field_name)!r} is not one of {', '.join(sorted(tax.allowed(vocab)))}")
        if not any(card.get(k) for k in ("doi", "arxiv", "pmid", "nct", "url")):
            report.error(where, "needs an identifier: doi, arxiv, pmid, nct or url")
        if not card.get("doi") and card.get("type") in ("dataset", "report") and not card.get("accessed"):
            report.error(where, "a dataset or report without a DOI needs the date it was accessed")
        if card.get("doi") and card["doi"].lower().startswith(("http", "doi:")):
            report.error(where, "doi is the bare identifier, without https://doi.org/ or doi:")
        if card.get("type") == "preprint" and card.get("class") == "established":
            report.error(where, "a preprint cannot be established; use reported until it is published")
        if card.get("status") == "machine-checked" and atlas.as_date(card.get("checked")) is None:
            report.error(where, "a machine-checked card needs the date it was checked")
        if card.get("status") == "verified" and not card.get("reviewed_by"):
            report.error(where, "a verified card needs reviewed_by")
        reviewer = card.get("reviewed_by")
        if reviewer:
            if not isinstance(reviewer, str) or not atlas.GITHUB_HANDLE.match(reviewer):
                report.error(where, f"reviewed_by {reviewer!r} is not a GitHub handle (write it without @)")
            elif reviewer.lower() == str(card.get("added_by", "")).lower():
                report.error(where, "reviewed_by must be someone other than added_by; nobody verifies their own card")
            elif card.get("status") == "verified":
                eligible = {m.lower() for m in maintainers}
                for tech_id in ctx.cited_by.get(key, ()):
                    tech = ctx.techs[tech_id]
                    eligible |= {str(c).lower() for c in tech.data.get("curators", []) if isinstance(c, str)}
                    eligible |= {str(m).lower() for m in tax.domains.get(tech.domain, {}).get("moderators", [])}
                if reviewer.lower() not in eligible:
                    report.warn(where, f"verified by @{reviewer}, who no longer curates or moderates a technology that cites it")
        if atlas.as_date(card.get("added")) is None:
            report.error(where, "added must be a date (YYYY-MM-DD)")
        findings = card.get("finding", [])
        if not findings:
            report.error(where, "needs at least one finding")
        for index, finding in enumerate(findings, 1):
            fwhere = f"{where} finding {index}"
            for field_name in set(finding) - FINDING_KEYS:
                report.error(fwhere, f"unknown field {field_name!r}")
            quote = str(finding.get("quote", "")).strip()
            if not quote:
                report.error(fwhere, "needs a verbatim quote from the source")
            elif len(quote.split()) > MAX_QUOTE_WORDS:
                report.error(fwhere, f"quote has {len(quote.split())} words; keep it to {MAX_QUOTE_WORDS} or fewer")
            metric_id = finding.get("metric")
            if metric_id:
                if metric_id not in tax.metrics:
                    report.error(fwhere, f"unknown metric {metric_id!r}")
                else:
                    if not is_number(finding.get("value")):
                        report.error(fwhere, "a finding with a metric needs a numeric value")
                    if finding.get("unit") != tax.metrics[metric_id]["unit"]:
                        report.error(
                            fwhere, f"unit {finding.get('unit')!r} must be the metric's unit {tax.metrics[metric_id]['unit']!r}; convert the value"
                        )
                if not str(finding.get("conditions", "")).strip():
                    report.warn(fwhere, "a numeric finding should state its conditions")
        if not ctx.cited_by.get(key):
            report.warn(where, "no technology cites this card")


def main() -> int:
    report = Report()
    today = dt.date.today()
    ctx = generate.Context()
    maintainers = check_governance(report)
    check_taxonomy(ctx.tax, report)
    for tech in ctx.techs.values():
        check_technology(tech, ctx, report, today)
    check_cycles(ctx, report)
    check_evidence(ctx, report, maintainers)

    for relative, message in atlas.LOAD_ERRORS.items():
        report.error(relative, message)

    files = generate.outputs()
    for relative, content in files.items():
        path = atlas.ROOT / relative
        if not path.exists() or path.read_text(encoding="utf-8") != content:
            report.error(relative, "out of date; run python3 tools/generate.py")
    for relative in generate.stale_pages(files):
        report.error(relative, "has no TOML file any more; run python3 tools/generate.py")

    for warning in report.warnings:
        print(f"warning: {warning}")
    for error in report.errors:
        print(f"error: {error}", file=sys.stderr)
    if not report.errors:
        gaps = sum(len(t.gaps()) for t in ctx.techs.values())
        print(f"ok: {len(ctx.techs)} technologies, {gaps} gaps, {len(ctx.cards)} evidence cards")
    return 1 if report.errors else 0


if __name__ == "__main__":
    sys.exit(main())
