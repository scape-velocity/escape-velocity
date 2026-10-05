"""Build the data files of the site: the JSON export of the atlas and llms.txt.

    python3 tools/build_site.py              write _site/
    python3 tools/build_site.py --out DIR    write somewhere else

The output is what GitHub Pages serves (.github/workflows/pages.yml), next to the explorer that
web/ builds from atlas.json (decision 0012). It is never committed.

    _site/atlas.json      the whole atlas in one file, with derived fields (gap sizes, dependents,
                          citations); the format is described in docs/export.md
    _site/atlas.<lang>.json  the same in each published language of i18n/languages.toml, with the
                          translated texts in place of the English (decision 0014)
    _site/llms.txt        an index for language models (https://llmstxt.org)
    _site/llms-full.txt   every technology and evidence card as plain Markdown

The explorer reads _site/atlas.json at build time: `npm run build` in web/ writes web/out/, which
the workflow copies into _site/.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import atlas  # noqa: E402
import i18n  # noqa: E402

SCHEMA_VERSION = 1
SITE_URL = "https://scape-velocity.github.io/escape-velocity/"
SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}
LICENSE = {
    "data": "CC0-1.0",
    "text": "CC-BY-4.0",
    "code": "Apache-2.0",
    "note": "Data CC0-1.0; text CC-BY-4.0. Cite the atlas version.",
}


def git(*args: str) -> str:
    try:
        result = subprocess.run(["git", *args], cwd=atlas.ROOT, capture_output=True, text=True, timeout=10)
        return result.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def plain(value):
    """Make TOML values JSON-safe (dates become ISO strings)."""
    if isinstance(value, dict):
        return {k: plain(v) for k, v in value.items()}
    if isinstance(value, list):
        return [plain(v) for v in value]
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def pretty(text: str | None) -> str | None:
    """Unit exponents as superscripts for display: "USD kg^-1" becomes "USD kg⁻¹"."""
    if text is None:
        return None
    return re.sub(r"\^(-?\d+)", lambda m: m.group(1).translate(atlas.SUPERSCRIPT), text)


def round_or_none(value: float | None) -> float | None:
    return None if value is None else round(value, 3)


def cited_keys(tech: atlas.Technology) -> list[str]:
    keys = list(tech.data.get("readiness_evidence", []))
    for metric in tech.metrics():
        for part in ("current", "target", "limit"):
            key = metric.get(part, {}).get("evidence")
            if key:
                keys.append(key)
        keys += [entry.get("evidence") for entry in metric.get("history", []) if entry.get("evidence")]
    for gap in tech.gaps():
        keys += gap.get("evidence", [])
        for approach in gap.get("approach", []):
            keys += approach.get("evidence", [])
    return list(dict.fromkeys(keys))


def source_url(card: dict) -> str | None:
    if card.get("doi"):
        return f"https://doi.org/{card['doi']}"
    if card.get("arxiv"):
        return f"https://arxiv.org/abs/{card['arxiv']}"
    if card.get("pmid"):
        return f"https://pubmed.ncbi.nlm.nih.gov/{card['pmid']}/"
    if card.get("nct"):
        return f"https://clinicaltrials.gov/study/{card['nct']}"
    return card.get("url")


def relative(path: Path) -> str:
    return str(path.relative_to(atlas.ROOT))


def export(lang: str = "en") -> dict:
    """The atlas in English, or in a language of i18n/languages.toml with each text whose
    translation is current in place of the English."""
    words = atlas.WORDS if lang == "en" else i18n.words(lang)
    tax_files = atlas.taxonomy_files()
    techs = atlas.technologies()
    cards = atlas.evidence()
    coverage: dict[str, i18n.Coverage] = {}
    if lang != "en":
        coverage["taxonomy"] = i18n.Coverage()
        for name, data in tax_files.items():
            tax_files[name], part = i18n.translate(lang, f"taxonomy/{name}.toml", data)
            coverage["taxonomy"].add(part)
        for tech in techs.values():
            tech.data, coverage[tech.id] = i18n.translate(lang, relative(tech.path), tech.data)
        for key, (path, card) in list(cards.items()):
            translated, coverage[f"evidence/{key}"] = i18n.translate(lang, relative(path), card)
            cards[key] = (path, translated)
    tax = atlas.taxonomy(tax_files)

    def translation(key: str) -> dict:
        return {"translation": coverage[key].as_dict()} if key in coverage else {}

    required_by: dict[str, list[dict]] = defaultdict(list)
    for tech in techs.values():
        for requirement in tech.requires():
            required_by[requirement.get("technology", "")].append({**plain(requirement), "technology": tech.id})
    cited_by: dict[str, list[str]] = defaultdict(list)
    for tech in techs.values():
        for key in cited_keys(tech):
            cited_by[key].append(tech.id)
    blocks: dict[str, list[dict]] = defaultdict(list)
    for tech in techs.values():
        for gap in tech.gaps():
            for blocker in gap.get("blocked_by", []):
                blocks[blocker].append({"technology": tech.id, "gap": gap.get("id"), "title": gap.get("title")})

    def dependents(tech_id: str) -> set[str]:
        seen: set[str] = set()
        stack = [tech_id]
        while stack:
            for entry in required_by.get(stack.pop(), []):
                if entry["technology"] not in seen:
                    seen.add(entry["technology"])
                    stack.append(entry["technology"])
        return seen

    technologies = []
    for tech in techs.values():
        metrics = []
        for metric in tech.metrics():
            definition = tax.metrics.get(metric.get("metric", ""), {})
            unit = definition.get("unit", "")
            current = metric.get("current", {}).get("value")
            target = metric.get("target", {}).get("value")
            limit = metric.get("limit", {}).get("value")
            gap = atlas.gap_size(definition, current, target) if current is not None and target is not None else None
            room = atlas.headroom(definition, target, limit) if target is not None and limit is not None else None
            metrics.append({
                **plain(metric),
                "gap_to_target": round_or_none(gap),
                "target_to_limit": round_or_none(room),
                "display": {
                    "current": pretty(atlas.format_value(current, unit, words)) if current is not None else None,
                    "target": pretty(atlas.format_value(target, unit, words)) if target is not None else None,
                    "limit": pretty(atlas.format_value(limit, unit, words)) if limit is not None else None,
                    "gap_to_target": pretty(atlas.format_gap(definition, gap, words)) if gap is not None else None,
                    "target_to_limit": pretty(atlas.format_gap(definition, room, words)) if room is not None else None,
                },
            })
        open_gaps = [g for g in tech.gaps() if g.get("status") != "closed"]
        worst = min((SEVERITY_ORDER.get(g.get("severity"), 9) for g in open_gaps), default=None)
        all_dependents = dependents(tech.id)
        technologies.append({
            "id": tech.id,
            "domain": tech.domain,
            **{k: plain(v) for k, v in tech.data.items() if k not in ("metric", "gap", "requires")},
            "readiness_name": tax.level_name(tax.scale_of(tech), tech.data.get("readiness"), words),
            "metrics": metrics,
            "gaps": [plain(g) for g in tech.gaps()],
            "requires": [plain(r) for r in tech.requires()],
            "required_by": required_by.get(tech.id, []),
            "blocks": blocks.get(tech.id, []),
            "dependents": sorted(all_dependents),
            "dependent_domains": sorted({d.split("/")[0] for d in all_dependents} - {tech.domain}),
            "worst_open_severity": next((s for s, n in SEVERITY_ORDER.items() if n == worst), None),
            "evidence": cited_keys(tech),
            "source": f"{atlas.REPO_URL}/blob/main/{tech.path.relative_to(atlas.ROOT)}",
            "page": f"{atlas.REPO_URL}/blob/main/{tech.page}",
            "alan_machine": [
                {**item, "url": f"{atlas.ALAN_MACHINE_URL}{item['page']}/index.html"}
                for item in tech.data.get("alan_machine", [])
            ],
            **translation(tech.id),
        })

    evidence = []
    for key, (path, card) in cards.items():
        evidence.append({
            "key": key,
            **plain(card),
            "link": source_url(card),
            "cited_by": cited_by.get(key, []),
            "source": f"{atlas.REPO_URL}/blob/main/{path.relative_to(atlas.ROOT)}",
            **translation(f"evidence/{key}"),
        })

    vocabulary = {
        name: [{"id": k, "label": tax.label(name, k), "meaning": v} for k, v in items.items()]
        for name, items in tax.vocabulary.items()
    }
    total = i18n.Coverage()
    for part in coverage.values():
        total.add(part)
    language = i18n.languages().get(lang)
    return {
        "schema": SCHEMA_VERSION,
        "lang": lang,
        "tag": language.tag if language else "en",
        "name": "Escape Velocity",
        "description": "An open atlas of what each technology still needs to reach maturity.",
        "version": git("rev-parse", "--short", "HEAD") or "uncommitted",
        "version_date": git("log", "-1", "--format=%cs") or None,
        "license": LICENSE,
        "repository": atlas.REPO_URL,
        "site": SITE_URL,
        "alan_machine": atlas.ALAN_MACHINE_URL,
        "governance": {"maintainers": atlas.maintainers(), "url": atlas.GOVERNANCE_URL},
        "languages": [],  # filled in by main(), which builds every language
        **({"translation": total.as_dict()} if lang != "en" else {}),
        "taxonomy": {
            "domains": [plain(d) for d in tax.domains.values()],
            "metrics": [plain(m) for m in tax.metrics.values()],
            "readiness_scales": [plain(s) for s in tax.scales.values()],
            "sdgs": [{"id": k, "name": v} for k, v in tax.sdgs.items()],
            "vocabulary": vocabulary,
        },
        "technologies": technologies,
        "evidence": evidence,
    }


def paragraphs(text: str | None) -> str:
    return " ".join((text or "").split())


def tech_markdown(tech: dict, cards: dict[str, dict]) -> list[str]:
    lines = [f"## {tech['name']} ({tech['id']})", ""]
    lines.append(f"Status: {tech.get('status', '')}. Readiness: {tech['readiness_name']}.")
    if tech.get("readiness_note"):
        lines.append(f"Readiness note: {paragraphs(tech['readiness_note'])}")
    lines += ["", paragraphs(tech.get("statement")), ""]
    if tech.get("scope"):
        lines += [f"Scope: {paragraphs(tech['scope'])}", ""]
    if tech["metrics"]:
        lines.append("Metrics:")
        for metric in tech["metrics"]:
            shown = metric["display"]
            parts = [f"current {shown['current']}" if shown["current"] else "current not recorded"]
            if shown["target"]:
                parts.append(f"target {shown['target']}")
            if shown["limit"]:
                parts.append(f"limit {shown['limit']}")
            if shown["gap_to_target"]:
                parts.append(f"distance to target {shown['gap_to_target']}")
            sources = [metric.get(p, {}).get("evidence") for p in ("current", "target", "limit")]
            sources = [s for s in sources if s]
            line = f"- {metric.get('metric')}: {', '.join(parts)}"
            if metric.get("conditions"):
                line += f". Conditions: {paragraphs(metric['conditions'])}"
            if metric.get("target", {}).get("rationale"):
                line += f" Target rationale: {paragraphs(metric['target']['rationale'])}"
            if sources:
                line += f" Evidence: {', '.join(sources)}."
            lines.append(line)
        lines.append("")
    if tech["gaps"]:
        lines.append("Gaps:")
        for gap in tech["gaps"]:
            line = (
                f"- {gap.get('title')} [{gap.get('severity')}, {gap.get('type')}, layer {gap.get('layer')}, "
                f"{gap.get('status')}]: {paragraphs(gap.get('description'))}"
            )
            if gap.get("blocked_by"):
                line += f" Blocked by: {', '.join(gap['blocked_by'])}."
            for approach in gap.get("approach", []):
                line += f" Approach: {approach.get('name')}."
            if gap.get("evidence"):
                line += f" Evidence: {', '.join(gap['evidence'])}."
            lines.append(line)
        lines.append("")
    if tech["requires"]:
        lines.append("Requires:")
        for requirement in tech["requires"]:
            line = f"- {requirement.get('technology')}: {paragraphs(requirement.get('why'))}"
            if requirement.get("need"):
                line += f" Need: {paragraphs(requirement['need'])}"
            lines.append(line)
        lines.append("")
    if tech["required_by"]:
        lines += [f"Required by: {', '.join(r['technology'] for r in tech['required_by'])}.", ""]
    for item in tech["alan_machine"]:
        lines.append(f"The Alan Machine: [{item['title']}]({item['url']})")
    if tech["alan_machine"]:
        lines.append("")
    return lines


def card_markdown(card: dict) -> list[str]:
    authors = ", ".join(card.get("authors", []))
    lines = [f"## {card['key']}", "", f"{card.get('title')}. {authors}. {card.get('venue', '')}, {card.get('year', '')}."]
    if card.get("link"):
        lines.append(f"Source: {card['link']}")
    lines.append(f"Class: {card.get('class')}. Status: {card.get('status')}. Cited by: {', '.join(card['cited_by']) or 'none'}.")
    for finding in card.get("finding", []):
        value = ""
        if finding.get("metric"):
            value = f"{finding['metric']} = {finding.get('value')} {finding.get('unit', '')}".rstrip() + ". "
            if "uncertainty" in finding:
                value += f"Standard uncertainty: {finding['uncertainty']}. "
            if "interval" in finding:
                low, high = finding["interval"]
                value += f"Interval: {low} to {high} at coverage {finding.get('coverage')}. "
        lines.append(f"- {value}Conditions: {paragraphs(finding.get('conditions'))} Quote: \"{paragraphs(finding.get('quote'))}\"")
    lines.append("")
    return lines


def llms_txt(data: dict) -> str:
    lines = [
        "# Escape Velocity",
        "",
        f"> {data['description']} Each technology has metrics (current, target, physical limit), "
        "gaps classified by type, layer and severity, the other technologies it depends on, and "
        "evidence cards that carry every number with a source and a verbatim quote.",
        "",
        f"Atlas version {data['version']} ({data['version_date']}). Data CC0-1.0, text CC-BY-4.0: cite the "
        "version you used. Values marked unverified or machine-checked have not been reviewed by a curator.",
        "",
        "## Data",
        "",
        f"- [atlas.json]({SITE_URL}atlas.json): the whole atlas in one JSON file, with gap sizes, dependents and citations",
        f"- [llms-full.txt]({SITE_URL}llms-full.txt): every technology and evidence card as Markdown",
        f"- [Repository]({data['repository']}): the TOML sources, the MCP server (tools/mcp_server.py) and the skills",
        "",
    ]
    domains = {d["id"]: d for d in data["taxonomy"]["domains"]}
    by_domain: dict[str, list[dict]] = defaultdict(list)
    for tech in data["technologies"]:
        by_domain[tech["domain"]].append(tech)
    for domain_id, domain in domains.items():
        if not by_domain.get(domain_id):
            continue
        lines += [f"## {domain['name']}", ""]
        for tech in by_domain[domain_id]:
            headline = next((m for m in tech["metrics"] if m.get("headline")), None)
            note = f"{tech.get('status')}"
            if headline and headline["display"]["gap_to_target"]:
                note += f"; {headline.get('metric')} {headline['display']['gap_to_target']} from target"
            lines.append(f"- [{tech['name']}]({tech['page']}): {note}")
        lines.append("")
    lines += [
        "## Optional",
        "",
        f"- [The Alan Machine]({data['alan_machine']}): the open-source book about a supercomputer at the physical limits of computation, which shares the atlas's metrics",
        "",
    ]
    return "\n".join(lines)


def llms_full(data: dict) -> str:
    cards = {card["key"]: card for card in data["evidence"]}
    lines = [
        "# Escape Velocity: the full atlas",
        "",
        f"Atlas version {data['version']} ({data['version_date']}). {data['license']['note']} Source: {data['repository']}",
        "",
        "# Technologies",
        "",
    ]
    for tech in data["technologies"]:
        lines += tech_markdown(tech, cards)
    lines += ["# Evidence cards", ""]
    for card in data["evidence"]:
        lines += card_markdown(card)
    return "\n".join(lines)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", default=str(atlas.ROOT / "_site"))
    args = parser.parse_args(argv)
    out = Path(args.out)

    data = export()
    translations = {lang.id: export(lang.id) for lang in i18n.languages().values() if lang.published}
    if atlas.LOAD_ERRORS:
        for where, error in atlas.LOAD_ERRORS.items():
            print(f"error: {where}: {error}", file=sys.stderr)
        return 1

    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    listing = [{"id": "en", "tag": "en", "name": "English", "english_name": "English", "maintainers": [], "file": "atlas.json"}]
    for lang_id, translated in translations.items():
        language = i18n.languages()[lang_id]
        listing.append({
            "id": lang_id,
            "tag": language.tag,
            "name": language.name,
            "english_name": language.english_name,
            "maintainers": language.maintainers,
            "file": f"atlas.{lang_id}.json",
            "translation": translated["translation"],
        })
    for name, content in [("atlas.json", data)] + [(f"atlas.{k}.json", v) for k, v in translations.items()]:
        content["languages"] = listing
        (out / name).write_text(json.dumps(content, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (out / "llms.txt").write_text(llms_txt(data), encoding="utf-8")
    (out / "llms-full.txt").write_text(llms_full(data), encoding="utf-8")
    print(
        f"wrote {out.relative_to(atlas.ROOT) if out.is_relative_to(atlas.ROOT) else out}: "
        f"{len(data['technologies'])} technologies, {len(data['evidence'])} evidence cards, version {data['version']}"
    )
    for lang_id, translated in translations.items():
        part = translated["translation"]
        print(f"  atlas.{lang_id}.json: {part['translated']} of {part['total']} texts translated, {part['machine']} by machine, {part['stale']} stale")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
