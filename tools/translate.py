"""Work on a translation of the atlas (decision 0014, docs/translating.md).

    python3 tools/translate.py status [--lang pt] [--list stale|missing]
                                      how much of each language is translated, and what is stale
    python3 tools/translate.py template pt FILE... | --all
                                      add the texts an overlay lacks, with an empty translation
    python3 tools/translate.py show pt FILE
                                      each English text next to its translation and its state
    python3 tools/translate.py stamp pt FILE... [--path PATH]
                                      after updating a stale translation, record the English it
                                      now follows

FILE is a source file (atlas/climate/direct-air-capture.toml, evidence/keith2018process.toml,
taxonomy/metrics.toml) or its overlay under i18n/<lang>/. The commands that write rewrite the
whole overlay in the order of the source file.
"""

from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import atlas  # noqa: E402
import i18n  # noqa: E402


def area(source: str) -> str:
    return source.split("/", 1)[0]


def resolve(lang: str, names: list[str], every: bool) -> list[str]:
    known = i18n.sources()
    if every:
        return list(known)
    found = []
    for name in names:
        path = Path(name).resolve()
        relative = str(path.relative_to(atlas.ROOT)) if path.is_relative_to(atlas.ROOT) else name
        prefix = f"i18n/{lang}/"
        if relative.startswith(prefix):
            relative = relative[len(prefix):]
        if relative not in known:
            raise SystemExit(f"{name}: not a source file the atlas translates (atlas/, evidence/ or taxonomy/)")
        found.append(relative)
    return found


def language(lang: str) -> i18n.Language:
    registered = i18n.languages()
    if lang not in registered:
        raise SystemExit(f"{lang}: not in i18n/languages.toml (registered: {', '.join(registered) or 'none'})")
    return registered[lang]


def status(args) -> int:
    langs = [language(args.lang)] if args.lang else list(i18n.languages().values())
    known = i18n.sources()
    for lang in langs:
        totals: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        listed: list[str] = []
        for source, data in known.items():
            for item in i18n.states(lang.id, source, data):
                totals[area(source)][item.state] += 1
                totals[area(source)]["total"] += 1
                if args.list == item.state:
                    listed.append(f"  {source}  {item.slot.path}")
        print(f"{lang.english_name} ({lang.id}), maintained by {', '.join('@' + m for m in lang.maintainers) or 'nobody'}")
        print(f"  {'':10} {'texts':>6} {'reviewed':>9} {'machine':>8} {'stale':>6} {'missing':>8}")
        for name in ("taxonomy", "atlas", "evidence"):
            row = totals[name]
            print(
                f"  {name:10} {row['total']:>6} {row['reviewed']:>9} {row['machine']:>8} {row['stale']:>6} {row['missing']:>8}"
            )
        if args.list:
            print(f"\n{args.list}:" if listed else f"\nnothing {args.list}")
            print("\n".join(listed))
    return 0


def template(args) -> int:
    language(args.lang)
    known = i18n.sources()
    for source in resolve(args.lang, args.files, args.all):
        file = i18n.overlay_path(args.lang, source)
        overlay = i18n.load_overlay(file) if file.is_file() else i18n.Overlay(file=file)
        present = overlay.by_path()
        added = 0
        for slot in i18n.slots(source, known[source]):
            if slot.path not in present:
                overlay.entries.append(i18n.Entry(path=slot.path, source=i18n.fingerprint(slot.english), text=""))
                added += 1
        if added or file.is_file():
            i18n.write_overlay(args.lang, source, known[source], overlay)
            print(f"{file.relative_to(atlas.ROOT)}: {added} texts added")
    return 0


def show(args) -> int:
    language(args.lang)
    known = i18n.sources()
    for source in resolve(args.lang, args.files, False):
        for item in i18n.states(args.lang, source, known[source]):
            print(f"[{item.state}] {item.slot.path}")
            print(f"  en: {' '.join(item.slot.english.split())}")
            if item.entry and item.entry.text.strip():
                print(f"  {args.lang}: {' '.join(item.entry.text.split())}")
            print()
    return 0


def stamp(args) -> int:
    language(args.lang)
    known = i18n.sources()
    for source in resolve(args.lang, args.files, False):
        file = i18n.overlay_path(args.lang, source)
        if not file.is_file():
            print(f"{source}: no overlay", file=sys.stderr)
            continue
        overlay = i18n.load_overlay(file)
        english = {slot.path: slot.english for slot in i18n.slots(source, known[source])}
        changed = 0
        for entry in overlay.entries:
            if entry.path in english and (not args.path or entry.path in args.path):
                new = i18n.fingerprint(english[entry.path])
                if entry.source != new:
                    entry.source = new
                    changed += 1
        i18n.write_overlay(args.lang, source, known[source], overlay)
        print(f"{file.relative_to(atlas.ROOT)}: {changed} texts stamped")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("status", help="coverage of each language")
    p.add_argument("--lang")
    p.add_argument("--list", choices=["stale", "missing", "machine"])
    p = sub.add_parser("template", help="add the texts an overlay lacks")
    p.add_argument("lang")
    p.add_argument("files", nargs="*")
    p.add_argument("--all", action="store_true", help="every source file")
    p = sub.add_parser("show", help="English and translation side by side")
    p.add_argument("lang")
    p.add_argument("files", nargs="+")
    p = sub.add_parser("stamp", help="record the English a translation now follows")
    p.add_argument("lang")
    p.add_argument("files", nargs="+")
    p.add_argument("--path", action="append", help="only this text; repeat for more")
    args = parser.parse_args(argv)
    if args.command == "template" and not (args.files or args.all):
        parser.error("template needs FILE... or --all")
    return {"status": status, "template": template, "show": show, "stamp": stamp}[args.command](args)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
