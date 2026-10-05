"""Small first tasks in the Escape Velocity atlas.

    python3 skills/first-contribution/scripts/good_first.py
    python3 skills/first-contribution/scripts/good_first.py --lang pt --limit 10
    python3 skills/first-contribution/scripts/good_first.py --json

Prints three lists, each cut at --limit (default 5):
  proposed     technologies with status proposed and what each still needs to become scoping
               (a headline metric with current and target, and last_reviewed, as tools/check.py asks);
  evidence     evidence cards whose status is not machine-checked;
  translation  texts whose translation into --lang (default pt) is missing or stale.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools"))

import atlas  # noqa: E402
import i18n  # noqa: E402


def proposed(limit: int) -> list[dict]:
    found = []
    for tech in atlas.technologies().values():
        if tech.status != "proposed":
            continue
        needs = []
        headline = tech.headline()
        if headline is None:
            needs.append("a headline metric")
        else:
            for part in ("current", "target"):
                if part not in headline:
                    needs.append(f"{part} for the headline metric {headline.get('id')!r}")
        if "last_reviewed" not in tech.data:
            needs.append("last_reviewed")
        found.append({"technology": tech.id, "file": str(tech.path.relative_to(ROOT)), "needs": needs})
    return found[:limit]


def evidence(limit: int) -> list[dict]:
    found = []
    for key, (path, card) in atlas.evidence().items():
        status = card.get("status", "")
        if status != "machine-checked":
            found.append({"key": key, "file": str(path.relative_to(ROOT)), "status": status or "(none)"})
    return found[:limit]


def translation(lang: str, limit: int) -> list[dict]:
    found = []
    for source, data in i18n.sources().items():
        for state in i18n.states(lang, source, data):
            if state.state in ("missing", "stale"):
                found.append({"source": source, "path": state.slot.path, "state": state.state})
                if len(found) >= limit:
                    return found
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--lang", default="pt")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = {
        "proposed": proposed(args.limit),
        "evidence": evidence(args.limit),
        "translation": translation(args.lang, args.limit),
    }
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0

    print("Proposed technologies and what they need for scoping:")
    for item in result["proposed"]:
        needs = "; ".join(item["needs"]) or 'nothing: set status = "scoping"'
        print(f"  {item['technology']}: {needs}")
    if not result["proposed"]:
        print("  (none)")
    print("\nEvidence cards not machine-checked:")
    for item in result["evidence"]:
        print(f"  {item['key']} ({item['status']})")
    if not result["evidence"]:
        print("  (none)")
    print(f"\nTexts missing or stale in {args.lang}:")
    for item in result["translation"]:
        print(f"  {item['source']}  {item['path']}  [{item['state']}]")
    if not result["translation"]:
        print("  (none)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
