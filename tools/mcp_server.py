"""A read-only MCP server over the local atlas, on stdio. Standard library only.

    python3 tools/mcp_server.py

Claude Code picks it up from .mcp.json at the repository root. Other MCP clients: run the command
above with the repository as the working directory.

Every tool reads the TOML in this clone, or queries the open literature APIs; none writes. Changes
to the atlas go through pull requests (decision 0007).
"""

from __future__ import annotations

import json
import subprocess
import sys
import traceback
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import atlas  # noqa: E402
import literature  # noqa: E402

PROTOCOL_VERSIONS = ("2025-06-18", "2025-03-26", "2024-11-05")
SERVER_INFO = {"name": "escape-velocity", "version": "0.1.0"}
LICENSE_NOTE = "Data CC0-1.0; text CC-BY-4.0. Cite the atlas version."


def atlas_version() -> str:
    try:
        return subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"], cwd=atlas.ROOT, capture_output=True, text=True, timeout=5
        ).stdout.strip() or "uncommitted"
    except (OSError, subprocess.SubprocessError):
        return "unknown"


class Atlas:
    """A snapshot of the data, reloaded on every call so edits in the clone show up."""

    def __init__(self):
        self.tax = atlas.taxonomy()
        self.techs = atlas.technologies()
        self.cards = atlas.evidence()
        self.required_by: dict[str, list[str]] = defaultdict(list)
        for tech in self.techs.values():
            for requirement in tech.requires():
                self.required_by[requirement.get("technology", "")].append(tech.id)

    def tech(self, tech_id: str) -> atlas.Technology:
        if tech_id not in self.techs:
            close = [t for t in self.techs if tech_id.split("/")[-1] in t]
            hint = f" Did you mean: {', '.join(close[:5])}?" if close else " Use list_technologies."
            raise ValueError(f"No technology {tech_id!r}.{hint}")
        return self.techs[tech_id]

    def headline(self, tech: atlas.Technology) -> dict | None:
        metric = tech.headline()
        if metric is None:
            return None
        definition = self.tax.metrics.get(metric.get("metric", ""), {})
        current = metric.get("current", {}).get("value")
        target = metric.get("target", {}).get("value")
        size = atlas.gap_size(definition, current, target) if current is not None and target is not None else None
        return {
            "metric": metric.get("metric"),
            "unit": definition.get("unit"),
            "current": current,
            "as_of": str(metric.get("current", {}).get("as_of", "")) or None,
            "target": target,
            "gap": atlas.format_gap(definition, size),
        }

    def transitive(self, tech_id: str, up: bool) -> set[str]:
        seen: set[str] = set()
        stack = [tech_id]
        while stack:
            node = stack.pop()
            nxt = self.required_by.get(node, []) if up else [r.get("technology") for r in self.techs[node].requires() if r.get("technology") in self.techs]
            for other in nxt:
                if other not in seen:
                    seen.add(other)
                    stack.append(other)
        return seen


def plain(value):
    """Make TOML values JSON-safe (dates become ISO strings)."""
    if isinstance(value, dict):
        return {k: plain(v) for k, v in value.items()}
    if isinstance(value, list):
        return [plain(v) for v in value]
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def tool_list_technologies(args: dict) -> dict:
    data = Atlas()
    rows = []
    for tech in data.techs.values():
        if args.get("domain") and tech.domain != args["domain"]:
            continue
        if args.get("status") and tech.status != args["status"]:
            continue
        rows.append({
            "id": tech.id,
            "name": tech.name,
            "status": tech.status,
            "readiness": data.tax.level_name(data.tax.scale_of(tech), tech.data.get("readiness")),
            "headline": data.headline(tech),
            "open_gaps": sum(1 for g in tech.gaps() if g.get("status") != "closed"),
            "requires": [r.get("technology") for r in tech.requires()],
            "required_by": data.required_by.get(tech.id, []),
        })
    return {"count": len(rows), "technologies": rows}


def tool_technology(args: dict) -> dict:
    data = Atlas()
    tech = data.tech(args["id"])
    metrics = []
    for metric in tech.metrics():
        definition = data.tax.metrics.get(metric.get("metric", ""), {})
        current = metric.get("current", {}).get("value")
        target = metric.get("target", {}).get("value")
        limit = metric.get("limit", {}).get("value")
        metrics.append({
            **plain(metric),
            "definition": {k: definition.get(k) for k in ("name", "unit", "direction", "scale")},
            "gap_to_target": atlas.format_gap(definition, atlas.gap_size(definition, current, target)) if current is not None and target is not None else None,
            "target_to_limit": atlas.format_gap(definition, atlas.headroom(definition, target, limit)) if target is not None and limit is not None else None,
        })
    return {
        "id": tech.id,
        "domain": tech.domain,
        **{k: plain(v) for k, v in tech.data.items() if k != "metric"},
        "readiness_name": data.tax.level_name(data.tax.scale_of(tech), tech.data.get("readiness")),
        "metric": metrics,
        "required_by": [
            {"technology": dependent, "needs": plain(next((r for r in data.techs[dependent].requires() if r.get("technology") == tech.id), {}))}
            for dependent in data.required_by.get(tech.id, [])
        ],
        "page": f"{atlas.REPO_URL}/blob/main/{tech.page}",
    }


def tool_gaps(args: dict) -> dict:
    data = Atlas()
    rows = []
    for tech in data.techs.values():
        if args.get("domain") and tech.domain != args["domain"]:
            continue
        for gap in tech.gaps():
            if any(args.get(f) and gap.get(f) != args[f] for f in ("type", "layer", "severity", "status")):
                continue
            rows.append({
                "technology": tech.id,
                "id": gap.get("id"),
                "title": gap.get("title"),
                "type": gap.get("type"),
                "layer": gap.get("layer"),
                "severity": gap.get("severity"),
                "status": gap.get("status"),
                "blocked_by": gap.get("blocked_by", []),
                "approaches": [a.get("name") for a in gap.get("approach", [])],
                "search_terms": gap.get("search_terms", []),
            })
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    rows.sort(key=lambda r: (order.get(r["severity"], 9), r["technology"]))
    return {"count": len(rows), "gaps": rows}


def tool_dependencies(args: dict) -> dict:
    data = Atlas()
    root = data.tech(args["id"])
    up = args.get("direction", "down") == "up"
    depth = max(1, min(int(args.get("depth", 3)), 6))

    def walk(tech_id: str, level: int) -> dict:
        tech = data.techs[tech_id]
        node = {"id": tech_id, "name": tech.name, "status": tech.status}
        if level < depth:
            if up:
                children = data.required_by.get(tech_id, [])
            else:
                children = [r.get("technology") for r in tech.requires() if r.get("technology") in data.techs]
            if children:
                node["requires" if not up else "required_by"] = [walk(child, level + 1) for child in children]
        return node

    return walk(root.id, 0)


def tool_bottlenecks(args: dict) -> dict:
    data = Atlas()
    rows = []
    for tech in data.techs.values():
        dependents = data.transitive(tech.id, up=True)
        if not dependents:
            continue
        blocked = sorted({t.id for t in data.techs.values() for g in t.gaps() if tech.id in g.get("blocked_by", [])})
        rows.append({
            "id": tech.id,
            "name": tech.name,
            "status": tech.status,
            "dependents": len(dependents),
            "domains": sorted({d.split("/")[0] for d in dependents} - {tech.domain}),
            "gaps_blocked_in": blocked,
            "open_gaps": [g.get("title") for g in tech.gaps() if g.get("status") != "closed"],
        })
    rows.sort(key=lambda r: (-len(r["domains"]), -r["dependents"], -len(r["gaps_blocked_in"])))
    return {"bottlenecks": rows[: int(args.get("limit", 10))]}


def tool_evidence(args: dict) -> dict:
    data = Atlas()
    key = args["key"]
    if key not in data.cards:
        raise ValueError(f"No evidence card {key!r}.")
    cited_by = []
    for tech in data.techs.values():
        text = json.dumps(plain(tech.data))
        if f'"{key}"' in text:
            cited_by.append(tech.id)
    return {"key": key, **plain(data.cards[key][1]), "cited_by": cited_by}


def tool_search_literature(args: dict) -> dict:
    sources = args.get("sources") or ["openalex", "arxiv"]
    results, failures = [], []
    for source in sources:
        try:
            works = literature.search(source, args["query"], args.get("since"), int(args.get("limit", 8)), args.get("arxiv_categories"))
        except literature.FetchError as error:
            failures.append(f"{source}: {error}")
            continue
        for work in works:
            item = work.as_dict()
            item["abstract"] = item["abstract"][:600] + ("..." if len(item["abstract"]) > 600 else "")
            results.append(item)
    return {"count": len(results), "results": results, "failures": failures,
            "note": "Candidates only. A number enters the atlas through an evidence card checked by review-evidence."}


def tool_abstract(args: dict) -> dict:
    work, sources = literature.lookup(args["identifier"])
    if work is None:
        raise ValueError(f"Not found: {args['identifier']}")
    return {**work.as_dict(), "answered": sources}


def tool_count_literature(args: dict) -> dict:
    return {"query": args["query"], "works_per_year": literature.openalex_count(args["query"], int(args.get("from", 2010)), args.get("to"))}


def facet(name: str) -> dict:
    return {"type": "string", "description": f"Filter by {name}"}


TOOLS = {
    "list_technologies": (tool_list_technologies, "List technologies in the atlas with status, readiness, headline metric and dependencies.",
                          {"domain": facet("domain id, such as quantum or health"), "status": facet("atlas status: proposed, scoping, mapped, tracked, achieved, retired")}, []),
    "technology": (tool_technology, "Everything about one technology: statement, metrics with gap to target and to the physical limit, gaps, dependencies, what dependents need from it.",
                   {"id": {"type": "string", "description": "Technology id, <domain>/<slug>, such as quantum/fault-tolerant-quantum-computer"}}, ["id"]),
    "gaps": (tool_gaps, "Gaps across the atlas, most severe first, filtered by facets.",
             {"domain": facet("domain id"), "type": facet("gap type, such as engineering or cost"), "layer": facet("layer: physics, device, system, manufacturing, deployment"),
              "severity": facet("severity: critical, high, medium, low"), "status": facet("gap status: open, active, promising, closed, beyond-limit")}, []),
    "dependencies": (tool_dependencies, "Dependency tree of a technology: what it requires (down) or what requires it (up).",
                     {"id": {"type": "string"}, "direction": {"type": "string", "enum": ["down", "up"]}, "depth": {"type": "integer", "minimum": 1, "maximum": 6}}, ["id"]),
    "bottlenecks": (tool_bottlenecks, "Technologies that the most others depend on, ranked by the number of other domains depending on them.",
                    {"limit": {"type": "integer", "minimum": 1, "maximum": 50}}, []),
    "evidence": (tool_evidence, "One evidence card: source, class, check status, findings with quotes, and the technologies citing it.",
                 {"key": {"type": "string", "description": "Card key, such as google2024quantum"}}, ["key"]),
    "search_literature": (tool_search_literature, "Search the open literature (openalex, arxiv, crossref, pubmed, trials, s2) for candidate work on a gap.",
                          {"query": {"type": "string"}, "sources": {"type": "array", "items": {"type": "string", "enum": list(literature.SOURCES)}},
                           "since": {"type": "integer", "description": "Publication year from"}, "limit": {"type": "integer", "minimum": 1, "maximum": 25},
                           "arxiv_categories": {"type": "array", "items": {"type": "string"}}}, ["query"]),
    "abstract": (tool_abstract, "Metadata and abstract of one work by doi:, arxiv:, pmid: or NCT identifier.",
                 {"identifier": {"type": "string"}}, ["identifier"]),
    "count_literature": (tool_count_literature, "Works per year in OpenAlex whose title or abstract match a query: a measure of research effort on a gap.",
                         {"query": {"type": "string"}, "from": {"type": "integer"}, "to": {"type": "integer"}}, ["query"]),
}


def tool_list() -> list[dict]:
    return [
        {"name": name, "description": description,
         "inputSchema": {"type": "object", "properties": properties, "required": required},
         "annotations": {"readOnlyHint": True}}
        for name, (_, description, properties, required) in TOOLS.items()
    ]


def handle(message: dict) -> dict | None:
    method = message.get("method")
    msg_id = message.get("id")
    if msg_id is None:
        return None  # notification
    if method == "initialize":
        requested = message.get("params", {}).get("protocolVersion")
        version = requested if requested in PROTOCOL_VERSIONS else PROTOCOL_VERSIONS[0]
        result = {"protocolVersion": version, "capabilities": {"tools": {"listChanged": False}}, "serverInfo": SERVER_INFO,
                  "instructions": "Read-only access to the Escape Velocity atlas of technology gaps. " + LICENSE_NOTE}
    elif method == "ping":
        result = {}
    elif method == "tools/list":
        result = {"tools": tool_list()}
    elif method == "tools/call":
        params = message.get("params", {})
        name = params.get("name")
        if name not in TOOLS:
            return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32602, "message": f"Unknown tool {name!r}"}}
        try:
            payload = TOOLS[name][0](params.get("arguments") or {})
            payload = {"atlas_version": atlas_version(), "license": LICENSE_NOTE, **payload}
            result = {"content": [{"type": "text", "text": json.dumps(payload, ensure_ascii=False, indent=1)}]}
        except (ValueError, KeyError, literature.FetchError) as error:
            result = {"content": [{"type": "text", "text": f"Error: {error}"}], "isError": True}
        except Exception:  # keep the server alive; report the failure to the client
            result = {"content": [{"type": "text", "text": "Internal error:\n" + traceback.format_exc(limit=3)}], "isError": True}
    else:
        return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32601, "message": f"Method not found: {method}"}}
    return {"jsonrpc": "2.0", "id": msg_id, "result": result}


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            message = json.loads(line)
        except json.JSONDecodeError:
            reply = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}
        else:
            reply = handle(message)
        if reply is not None:
            sys.stdout.write(json.dumps(reply, ensure_ascii=False) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
