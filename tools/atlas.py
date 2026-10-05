"""Shared helpers for the tools: load the taxonomy, the technologies and the evidence cards.

Only the Python standard library is used, so the tools run anywhere with Python 3.11 or later.
"""

from __future__ import annotations

import datetime as dt
import math
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO_URL = "https://github.com/scape-velocity/escape-velocity"
ALAN_MACHINE_URL = "https://the-alan-machine.github.io/alan-machine/"
SUPERSCRIPT = str.maketrans("0123456789-+", "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺")


def load_toml(path: Path) -> dict:
    with open(path, "rb") as handle:
        return tomllib.load(handle)


@dataclass
class Taxonomy:
    domains: dict[str, dict]
    scales: dict[str, dict]
    metrics: dict[str, dict]
    sdgs: dict[int, str]
    vocabulary: dict[str, dict[str, str]]  # field -> {value: meaning}

    def allowed(self, field_name: str) -> set[str]:
        return set(self.vocabulary.get(field_name, {}))

    def scale_of(self, tech: "Technology") -> dict | None:
        scale_id = tech.data.get("readiness_scale") or self.domains.get(tech.domain, {}).get("readiness_scale")
        return self.scales.get(scale_id)

    def level_name(self, scale: dict | None, level) -> str:
        if scale is None or level is None:
            return "not assessed"
        levels = {item["level"]: item for item in scale.get("level", [])}
        if level not in levels:
            return f"level {level}"
        top = max(levels)
        return f"{levels[level]['name']} ({level} of {top})"


def taxonomy() -> Taxonomy:
    base = ROOT / "taxonomy"
    vocabulary_file = load_toml(base / "vocabulary.toml")
    vocabulary = {
        name: {item["id"]: item.get("meaning", "") for item in items}
        for name, items in vocabulary_file.items()
    }
    return Taxonomy(
        domains={item["id"]: item for item in load_toml(base / "domains.toml").get("domain", [])},
        scales={item["id"]: item for item in load_toml(base / "readiness-scales.toml").get("scale", [])},
        metrics={item["id"]: item for item in load_toml(base / "metrics.toml").get("metric", [])},
        sdgs={item["id"]: item["name"] for item in load_toml(base / "sdgs.toml").get("sdg", [])},
        vocabulary=vocabulary,
    )


@dataclass
class Technology:
    id: str  # "<domain>/<slug>"
    path: Path
    data: dict = field(default_factory=dict)

    @property
    def domain(self) -> str:
        return self.id.split("/", 1)[0]

    @property
    def slug(self) -> str:
        return self.id.split("/", 1)[1]

    @property
    def name(self) -> str:
        return self.data.get("name", self.slug)

    @property
    def status(self) -> str:
        return self.data.get("status", "")

    @property
    def page(self) -> str:
        """The generated Markdown page, relative to ROOT."""
        return f"atlas/{self.domain}/{self.slug}.md"

    def metrics(self) -> list[dict]:
        return self.data.get("metric", [])

    def headline(self) -> dict | None:
        for metric in self.metrics():
            if metric.get("headline"):
                return metric
        return None

    def gaps(self) -> list[dict]:
        return self.data.get("gap", [])

    def requires(self) -> list[dict]:
        return self.data.get("requires", [])


# Files that are not valid TOML. They are skipped, and tools/check.py reports them.
LOAD_ERRORS: dict[str, str] = {}


def _load_or_record(path: Path) -> dict | None:
    try:
        return load_toml(path)
    except tomllib.TOMLDecodeError as error:
        LOAD_ERRORS[str(path.relative_to(ROOT))] = f"not valid TOML: {error}"
        return None


def technologies() -> dict[str, Technology]:
    found = {}
    for path in sorted((ROOT / "atlas").glob("*/*.toml")):
        data = _load_or_record(path)
        if data is not None:
            tech_id = f"{path.parent.name}/{path.stem}"
            found[tech_id] = Technology(id=tech_id, path=path, data=data)
    return found


def evidence() -> dict[str, tuple[Path, dict]]:
    found = {}
    for path in sorted((ROOT / "evidence").glob("*.toml")):
        data = _load_or_record(path)
        if data is not None:
            found[path.stem] = (path, data)
    return found


def as_date(value) -> dt.date | None:
    if isinstance(value, dt.datetime):
        return value.date()
    if isinstance(value, dt.date):
        return value
    if isinstance(value, str):
        try:
            return dt.date.fromisoformat(value)
        except ValueError:
            return None
    return None


def gap_size(metric_def: dict, current: float, target: float) -> float | None:
    """How far the current value is from the target, in the direction that counts as progress.

    Log metrics: orders of magnitude. Linear metrics: the difference in the metric's unit.
    Zero or negative means the target is met.
    """
    lower = metric_def.get("direction") == "lower"
    if metric_def.get("scale") == "log":
        if current <= 0 or target <= 0:
            return None
        size = math.log10(current / target)
        return size if lower else -size
    return current - target if lower else target - current


def headroom(metric_def: dict, target: float, limit: float) -> float | None:
    """How far the target is from the physical limit. Negative means the target is beyond the limit."""
    return gap_size(metric_def, target, limit)


def format_number(value) -> str:
    if isinstance(value, bool) or value is None:
        return str(value)
    if isinstance(value, int) and abs(value) < 1_000_000:
        return f"{value:,}".replace(",", " ")
    number = float(value)
    if number == 0:
        return "0"
    exponent = math.floor(math.log10(abs(number)))
    if -3 <= exponent <= 5:
        text = f"{number:.6g}"
        if "e" not in text:
            whole, _, frac = text.partition(".")
            if len(whole.lstrip("-")) > 3:
                whole = f"{int(whole):,}".replace(",", " ")
            return f"{whole}.{frac}" if frac else whole
    mantissa = number / 10**exponent
    mantissa_text = f"{mantissa:.3g}"
    if mantissa_text == "1":
        return f"10{str(exponent).translate(SUPERSCRIPT)}"
    return f"{mantissa_text} × 10{str(exponent).translate(SUPERSCRIPT)}"


def format_value(value, unit: str) -> str:
    if value is None:
        return "–"
    number = format_number(value)
    if unit in ("", "1"):
        return number
    if unit == "%":
        return f"{number}%"
    return f"{number} {unit}"


def format_gap(metric_def: dict, size: float | None) -> str:
    if size is None:
        return "–"
    if size <= 0:
        return "met"
    if metric_def.get("scale") == "log":
        return f"{size:.1f} orders of magnitude"
    unit = metric_def.get("unit", "")
    return f"{format_number(round(size, 3))} {'points' if unit == '%' else unit}".strip()
