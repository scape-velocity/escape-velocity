"""Translations of the atlas (decision 0014).

English is the source. A translation is an overlay: for a source file such as
atlas/climate/direct-air-capture.toml, the file i18n/<lang>/atlas/climate/direct-air-capture.toml
lists texts that replace the English ones, each with the fingerprint of the English it was
translated from. When the English changes, the fingerprint no longer matches, the translation is
stale, and readers get the English until a translator updates it. English contributors never edit
translations.

    i18n/languages.toml           the languages, with their maintainers
    i18n/<lang>/strings.toml      the words the tools put around numbers (atlas.WORDS)
    i18n/<lang>/glossary.toml     the terms translators agree on
    i18n/<lang>/<source>.toml     an overlay for each source file

Only prose is translated: names, statements, notes, conditions, meanings. Identifiers, numbers,
units, search terms and everything quoted from a source stay as they are.
"""

from __future__ import annotations

import copy
import hashlib
import json
import re
import textwrap
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

import atlas

BASE = atlas.ROOT / "i18n"
LANGUAGES_FILE = BASE / "languages.toml"
STATUSES = ("machine", "reviewed")
FINGERPRINT = re.compile(r"^[0-9a-f]{10}$")
LANGUAGE_ID = re.compile(r"^[a-z]{2,3}(-[a-z0-9]+)?$")
LANGUAGE_TAG = re.compile(r"^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$")
WIDTH = 100


@dataclass
class Language:
    id: str
    tag: str
    name: str
    english_name: str
    maintainers: list[str]
    published: bool

    @property
    def folder(self) -> Path:
        return BASE / self.id


def languages() -> dict[str, Language]:
    """The registered languages, from i18n/languages.toml; English is the source and is not one."""
    if not LANGUAGES_FILE.is_file():
        return {}
    found = {}
    for item in atlas.load_toml(LANGUAGES_FILE).get("language", []):
        found[item.get("id", "")] = Language(
            id=item.get("id", ""),
            tag=item.get("tag", ""),
            name=item.get("name", ""),
            english_name=item.get("english_name", ""),
            maintainers=list(item.get("maintainers", [])),
            published=bool(item.get("published", False)),
        )
    return found


def fingerprint(text: str) -> str:
    """The first ten hex digits of the SHA-256 of the text with its whitespace collapsed, so that
    rewrapping a paragraph does not make its translations stale."""
    return hashlib.sha256(" ".join(str(text).split()).encode("utf-8")).hexdigest()[:10]


# Where each translatable text sits in a source file -------------------------------------------


@dataclass
class Slot:
    path: str  # such as "gap[cost].description"
    english: str
    table: dict  # the table that holds the text
    key: str  # the field in that table


def _text(table: dict, key: str) -> bool:
    return isinstance(table.get(key), str) and bool(table[key].strip())


def _technology(data: dict):
    for key in ("name", "statement", "scope", "readiness_note", "horizon", "retired_reason"):
        if _text(data, key):
            yield Slot(key, data[key], data, key)
    for requirement in data.get("requires", []):
        for key in ("why", "need"):
            if _text(requirement, key):
                yield Slot(f"requires[{requirement.get('technology')}].{key}", requirement[key], requirement, key)
    for metric in data.get("metric", []):
        where = f"metric[{metric.get('id')}]"
        if _text(metric, "conditions"):
            yield Slot(f"{where}.conditions", metric["conditions"], metric, "conditions")
        for part in ("current", "target", "limit"):
            table = metric.get(part)
            if isinstance(table, dict):
                for key in ("note", "rationale", "basis"):
                    if _text(table, key):
                        yield Slot(f"{where}.{part}.{key}", table[key], table, key)
        for index, entry in enumerate(metric.get("history", []), 1):
            if isinstance(entry, dict) and _text(entry, "note"):
                yield Slot(f"{where}.history[{index}].note", entry["note"], entry, "note")
    for gap in data.get("gap", []):
        where = f"gap[{gap.get('id')}]"
        for key in ("title", "description"):
            if _text(gap, key):
                yield Slot(f"{where}.{key}", gap[key], gap, key)
        for index, approach in enumerate(gap.get("approach", []), 1):
            if _text(approach, "name"):
                yield Slot(f"{where}.approach[{index}].name", approach["name"], approach, "name")
    for page in data.get("alan_machine", []):
        if isinstance(page, dict) and _text(page, "title"):
            yield Slot(f"alan_machine[{page.get('page')}].title", page["title"], page, "title")


def _evidence(data: dict):
    # The title, authors and venue are the source's own, and the quote is verbatim: none of them
    # is translated.
    if _text(data, "note"):
        yield Slot("note", data["note"], data, "note")
    for index, finding in enumerate(data.get("finding", []), 1):
        for key in ("conditions", "note"):
            if _text(finding, key):
                yield Slot(f"finding[{index}].{key}", finding[key], finding, key)


def _taxonomy(name: str, data: dict):
    def items(table_name: str, keys: tuple[str, ...]):
        for item in data.get(table_name, []):
            for key in keys:
                if _text(item, key):
                    yield Slot(f"{table_name}[{item.get('id')}].{key}", item[key], item, key)

    if name == "domains":
        yield from items("domain", ("name", "summary"))
    elif name == "metrics":
        yield from items("metric", ("name", "meaning"))
    elif name == "sdgs":
        yield from items("sdg", ("name",))
    elif name == "readiness-scales":
        for scale in data.get("scale", []):
            where = f"scale[{scale.get('id')}]"
            for key in ("name", "summary"):
                if _text(scale, key):
                    yield Slot(f"{where}.{key}", scale[key], scale, key)
            for level in scale.get("level", []):
                for key in ("name", "meaning"):
                    if _text(level, key):
                        yield Slot(f"{where}.level[{level.get('level')}].{key}", level[key], level, key)
    elif name == "vocabulary":
        for field_name, values in data.items():
            for item in values:
                # A value has no label in English: its id with spaces for hyphens is the label.
                yield Slot(f"{field_name}[{item.get('id')}].label", item.get("label") or item["id"].replace("-", " "), item, "label")
                if _text(item, "meaning"):
                    yield Slot(f"{field_name}[{item.get('id')}].meaning", item["meaning"], item, "meaning")


def slots(source: str, data: dict) -> list[Slot]:
    """The translatable texts of a source file, given by its path relative to the repository."""
    if source.startswith("atlas/"):
        return list(_technology(data))
    if source.startswith("evidence/"):
        return list(_evidence(data))
    if source.startswith("taxonomy/"):
        return list(_taxonomy(Path(source).stem, data))
    return []


def sources() -> dict[str, dict]:
    """Every source file a translation can overlay, by its path relative to the repository."""
    found: dict[str, dict] = {}
    for name, data in atlas.taxonomy_files().items():
        found[f"taxonomy/{name}.toml"] = data
    for tech in atlas.technologies().values():
        found[str(tech.path.relative_to(atlas.ROOT))] = tech.data
    for path, card in atlas.evidence().values():
        found[str(path.relative_to(atlas.ROOT))] = card
    return found


def overlay_path(lang: str, source: str) -> Path:
    return BASE / lang / source


def source_of(lang: str, overlay: Path) -> str:
    return str(overlay.relative_to(BASE / lang))


# Overlays --------------------------------------------------------------------------------------


@dataclass
class Entry:
    path: str
    source: str
    text: str
    status: str | None = None  # overrides the file's status for this text


@dataclass
class Overlay:
    file: Path
    status: str = "machine"
    reviewed_by: list[str] = field(default_factory=list)
    entries: list[Entry] = field(default_factory=list)
    raw: dict = field(default_factory=dict)

    def by_path(self) -> dict[str, Entry]:
        return {entry.path: entry for entry in self.entries}


def load_overlay(file: Path) -> Overlay:
    """Read an overlay. Raises tomllib.TOMLDecodeError; tools/check.py reports malformed fields."""
    raw = atlas.load_toml(file)
    entries = [
        Entry(
            path=str(item.get("path", "")),
            source=str(item.get("source", "")),
            text=item.get("text", "") if isinstance(item.get("text", ""), str) else "",
            status=item.get("status"),
        )
        for item in raw.get("text", [])
        if isinstance(item, dict)
    ]
    return Overlay(
        file=file,
        status=raw.get("status", "machine"),
        reviewed_by=list(raw.get("reviewed_by", [])),
        entries=entries,
        raw=raw,
    )


@dataclass
class Coverage:
    total: int = 0
    translated: int = 0  # current translations, machine or reviewed
    machine: int = 0  # of those, the ones nobody has reviewed
    stale: int = 0  # translated from an English text that has changed since
    reviewed_by: list[str] = field(default_factory=list)

    def add(self, other: "Coverage"):
        self.total += other.total
        self.translated += other.translated
        self.machine += other.machine
        self.stale += other.stale
        for person in other.reviewed_by:
            if person not in self.reviewed_by:
                self.reviewed_by.append(person)

    def as_dict(self) -> dict:
        return {
            "translated": self.translated,
            "total": self.total,
            "machine": self.machine,
            "stale": self.stale,
            "reviewed_by": self.reviewed_by,
        }


@dataclass
class State:
    slot: Slot
    entry: Entry | None
    state: str  # "missing", "stale", "machine" or "reviewed"


def states(lang: str, source: str, data: dict, overlay: Overlay | None = None) -> list[State]:
    """Each translatable text of a source file and where its translation stands."""
    if overlay is None:
        file = overlay_path(lang, source)
        overlay = load_overlay(file) if file.is_file() else Overlay(file=file)
    entries = overlay.by_path()
    found = []
    for slot in slots(source, data):
        entry = entries.get(slot.path)
        if entry is None or not entry.text.strip():
            state = "missing"
        elif entry.source != fingerprint(slot.english):
            state = "stale"
        else:
            state = entry.status if entry.status in STATUSES else overlay.status
            state = state if state in STATUSES else "machine"
        found.append(State(slot, entry, state))
    return found


def translate(lang: str, source: str, data: dict) -> tuple[dict, Coverage]:
    """A copy of a source file with the current translations in place of the English, and how
    much of it is translated. A stale or malformed overlay leaves the English."""
    copied = copy.deepcopy(data)
    coverage = Coverage()
    file = overlay_path(lang, source)
    try:
        overlay = load_overlay(file) if file.is_file() else Overlay(file=file)
    except (tomllib.TOMLDecodeError, UnicodeDecodeError):
        overlay = Overlay(file=file)
    for item in states(lang, source, copied, overlay):
        coverage.total += 1
        if item.state == "stale":
            coverage.stale += 1
        if item.state in STATUSES:
            coverage.translated += 1
            coverage.machine += item.state == "machine"
            text = item.entry.text
            if "\n" not in item.slot.english.strip():
                text = " ".join(text.split())  # one line in English, one line translated
            item.slot.table[item.slot.key] = text
    if overlay.status == "reviewed":
        coverage.reviewed_by = list(overlay.reviewed_by)
    return copied, coverage


def words(lang: str) -> dict:
    """atlas.WORDS with the language's own, from i18n/<lang>/strings.toml."""
    file = BASE / lang / "strings.toml"
    found = dict(atlas.WORDS)
    if file.is_file():
        try:
            own = atlas.load_toml(file)
        except tomllib.TOMLDecodeError:
            return found
        found.update({k: v for k, v in own.items() if k in atlas.WORDS and isinstance(v, str)})
    return found


# Writing overlays ------------------------------------------------------------------------------


def _string(key: str, text: str, multiline: bool) -> list[str]:
    single = f"{key} = {json.dumps(text.strip(), ensure_ascii=False)}"
    if not multiline and "\n" not in text.strip() and len(single) <= WIDTH:
        return [single]
    body = []
    for paragraph in re.split(r"\n\s*\n", text.strip()):
        flat = " ".join(paragraph.split()).replace("\\", "\\\\").replace('"""', '\\"""')
        body += textwrap.wrap(flat, WIDTH, break_long_words=False, break_on_hyphens=False) + [""]
    return [f'{key} = """', *body[:-1], '"""']


def write_overlay(lang: str, source: str, data: dict, overlay: Overlay):
    """Write an overlay in the order of its source file. Texts whose path the source no longer has
    are kept at the end, where tools/check.py reports them."""
    language = languages().get(lang)
    title = language.english_name if language else lang
    order = {slot.path: (index, slot) for index, slot in enumerate(slots(source, data))}
    entries = sorted(overlay.entries, key=lambda e: order.get(e.path, (len(order), None))[0])
    lines = [
        f"# {title} translation of {source} (decision 0014).",
        "# Each text replaces the English at `path` while `source` is the fingerprint of the English it",
        "# was translated from. Run python3 tools/translate.py show to see both side by side.",
        f'status = "{overlay.status}"',
        f"reviewed_by = {json.dumps(overlay.reviewed_by)}",
    ]
    for entry in entries:
        slot = order.get(entry.path, (None, None))[1]
        lines += ["", "[[text]]", f"path = {json.dumps(entry.path)}", f'source = "{entry.source}"']
        if entry.status:
            lines.append(f'status = "{entry.status}"')
        lines += _string("text", entry.text, multiline=bool(slot and "\n" in slot.english.strip()))
    overlay.file.parent.mkdir(parents=True, exist_ok=True)
    overlay.file.write_text("\n".join(lines) + "\n", encoding="utf-8")
