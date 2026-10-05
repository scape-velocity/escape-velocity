"""Who has to approve a pull request, and whether they have; and the domain of a new issue.

    python3 tools/moderation.py pr --dir .moderation
    python3 tools/moderation.py issue --body-file body.md

`pr` reads what .github/workflows/moderation.yml fetched into the directory: pr.json (the pull
request), files.jsonl and reviews.jsonl (the GitHub API's changed files and reviews, one JSON
object per line) and head/, the pull request's version of each TOML file it changes. It writes
result.json (state, description, reviewers to request) and comment.md. The maintainers,
moderators, curators and language maintainers come from this checkout, the main branch, so a pull
request that adds its author to a list does not make the author an approver. The pull request's files are parsed as
TOML, never run.

`issue` reads the body of an issue opened from a form and prints, as JSON, the domain or the
language, its label and the people to mention.

The rules are in GOVERNANCE.md.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tomllib
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import atlas  # noqa: E402
import i18n  # noqa: E402
from generate import Context  # noqa: E402

TECH_FILE = re.compile(r"^atlas/([a-z0-9-]+)/([a-z0-9-]+)\.toml$")
CARD_FILE = re.compile(r"^evidence/([a-z0-9]+)\.toml$")
# A translation (decision 0014): an overlay, the words and terms of a language, or its interface.
TRANSLATION_FILE = re.compile(r"^(?:i18n/([a-z0-9-]+)/.+|web/src/i18n/([a-z0-9-]+)\.json)$")
# Pages tools/generate.py writes from the TOML. tools/check.py fails when they drift from it, so
# they need no approval of their own.
GENERATED = re.compile(r"^(STATUS\.md|evidence/README\.md|atlas/[a-z0-9-]+/(README|[a-z0-9-]+)\.md)$")
MARKER = "<!-- moderation -->"
MAX_DESCRIPTION = 140  # GitHub's limit for a commit status description
MAX_LISTED = 6
MAX_REQUESTED = 15
DECISIVE = ("APPROVED", "CHANGES_REQUESTED", "DISMISSED")


def read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def handles(values) -> list[str]:
    """The valid GitHub handles in a list, in order, without repeats (case-insensitive)."""
    seen, found = set(), []
    for value in values if isinstance(values, list) else []:
        if isinstance(value, str) and atlas.GITHUB_HANDLE.match(value) and value.lower() not in seen:
            seen.add(value.lower())
            found.append(value)
    return found


def mention(people) -> str:
    return ", ".join(f"@{person}" for person in sorted(people, key=str.lower))


def either(people) -> str:
    names = [f"@{person}" for person in sorted(people, key=str.lower)]
    return names[0] if len(names) == 1 else ", ".join(names[:-1]) + " or " + names[-1]


def listed(items: list[str]) -> str:
    shown = ", ".join(f"`{item}`" for item in items[:MAX_LISTED])
    return shown + (f" and {len(items) - MAX_LISTED} more" if len(items) > MAX_LISTED else "")


def cited_keys(tech_id: str, data: dict) -> list[str]:
    try:
        return Context.cited_keys(atlas.Technology(id=tech_id, path=Path(), data=data))
    except (AttributeError, TypeError):
        return []  # malformed; tools/check.py reports it


def citations(techs: dict[str, dict]) -> dict[str, set[str]]:
    cited: dict[str, set[str]] = defaultdict(set)
    for tech_id, data in techs.items():
        for key in cited_keys(tech_id, data):
            if isinstance(key, str):
                cited[key].add(tech_id)
    return cited


@dataclass
class Group:
    """Changes that the same people can approve."""

    role: str  # "curators and moderators", "<language> maintainers" or "maintainers"
    people: list[str]  # who can approve, without the author
    covers: list[str] = field(default_factory=list)
    approved_by: list[str] = field(default_factory=list)
    waived: bool = False

    @property
    def done(self) -> bool:
        return self.waived or bool(self.approved_by)


class PullRequest:
    def __init__(self, directory: Path):
        self.dir = directory
        pr = json.loads((directory / "pr.json").read_text(encoding="utf-8"))
        self.number = pr["number"]
        self.author = pr["user"]["login"]
        self.head_sha = pr["head"]["sha"]
        self.maintainers = handles(atlas.maintainers())
        self.languages = i18n.languages()
        self.tax = atlas.taxonomy()
        self.base_techs = {tech_id: tech.data for tech_id, tech in atlas.technologies().items()}
        self.base_cards = {key: data for key, (_, data) in atlas.evidence().items()}

        self.changes: list[tuple[str, str]] = []
        for item in read_jsonl(directory / "files.jsonl"):
            if item.get("status") == "renamed" and item.get("previous_filename"):
                self.changes.append((item["previous_filename"], "removed"))
                self.changes.append((item["filename"], "added"))
            else:
                self.changes.append((item["filename"], item.get("status", "modified")))

        latest: dict[str, dict] = {}
        self.reviewed: set[str] = set()
        for review in sorted(read_jsonl(directory / "reviews.jsonl"), key=lambda r: r.get("submitted_at") or ""):
            login = (review.get("user") or {}).get("login")
            if not login:
                continue
            self.reviewed.add(login.lower())
            if review.get("state") in DECISIVE:
                latest[login.lower()] = review
        self.approved = {login for login, review in latest.items() if review["state"] == "APPROVED"}
        self.approved_on_head = {
            login for login, review in latest.items() if review["state"] == "APPROVED" and review.get("commit_id") == self.head_sha
        }

        self.groups: dict[tuple[str, frozenset[str]], Group] = {}
        self.failures: list[str] = []
        self.waiting: list[tuple[str, str]] = []  # (what, who)

    def head_toml(self, relative: str) -> dict | None:
        path = self.dir / "head" / relative
        if not path.is_file():
            return None
        try:
            return tomllib.loads(path.read_text(encoding="utf-8"))
        except (tomllib.TOMLDecodeError, UnicodeDecodeError):
            return None  # tools/check.py reports it

    def reviewers_of(self, tech_id: str) -> list[str]:
        """Curators of a technology (as on main) and moderators of its domain."""
        domain = self.tax.domains.get(tech_id.split("/", 1)[0], {})
        return handles(list(self.base_techs.get(tech_id, {}).get("curators", [])) + list(domain.get("moderators", [])))

    def add(self, people: list[str], what: str, role: str = "curators and moderators"):
        others = [person for person in people if person.lower() != self.author.lower()]
        if others:
            approvers = others
        else:
            role, approvers = "maintainers", [m for m in self.maintainers if m.lower() != self.author.lower()]
        key = (role, frozenset(person.lower() for person in approvers))
        group = self.groups.setdefault(key, Group(role=role, people=approvers))
        if what not in group.covers:
            group.covers.append(what)

    def check_verified(self, name: str, key: str, people: list[str]):
        card = self.head_toml(name)
        if not card or card.get("status") != "verified" or card == self.base_cards.get(key):
            return
        who = card.get("reviewed_by")
        allowed = people or self.maintainers
        if not isinstance(who, str) or not atlas.GITHUB_HANDLE.match(who):
            self.failures.append(f"{name}: reviewed_by must be the GitHub handle of the person who verified the card")
        elif who.lower() == str(card.get("added_by", "")).lower():
            self.failures.append(f"{name}: @{who} added this card, so someone else verifies it")
        elif who.lower() not in {person.lower() for person in allowed}:
            self.failures.append(f"{name}: @{who} does not curate or moderate a technology that cites this card")
        elif who.lower() != self.author.lower() and who.lower() not in self.approved_on_head:
            self.waiting.append((f"`{name}` is verified by @{who}, who approves the last commit", who))

    def evaluate(self) -> dict:
        head_techs = dict(self.base_techs)
        for name, status in self.changes:
            match = TECH_FILE.match(name)
            if not match:
                continue
            tech_id = f"{match.group(1)}/{match.group(2)}"
            if status == "removed":
                head_techs.pop(tech_id, None)
            elif (data := self.head_toml(name)) is not None:
                head_techs[tech_id] = data
        cited_before, cited_after = citations(self.base_techs), citations(head_techs)

        for name, status in self.changes:
            if GENERATED.match(name):
                continue
            if match := TECH_FILE.match(name):
                tech_id = f"{match.group(1)}/{match.group(2)}"
                self.add(self.reviewers_of(tech_id), name)
                if status != "removed":
                    before = handles(self.base_techs.get(tech_id, {}).get("curators", []))
                    after = handles((head_techs.get(tech_id) or {}).get("curators", []))
                    if sorted(p.lower() for p in before) != sorted(p.lower() for p in after):
                        self.add([], f"{name} (curators)")
            elif (match := TRANSLATION_FILE.match(name)) and (match.group(1) or match.group(2)) in self.languages:
                # Translators approve translations; the English they follow was approved already.
                lang = self.languages[match.group(1) or match.group(2)]
                self.add(handles(lang.maintainers), name, role=f"{lang.english_name} maintainers")
            elif match := CARD_FILE.match(name):
                key = match.group(1)
                people: list[str] = []
                for tech_id in sorted(cited_before.get(key, set()) | cited_after.get(key, set())):
                    people += self.reviewers_of(tech_id)
                people = handles(people)
                self.add(people, name)
                if status != "removed":
                    self.check_verified(name, key, people)
            else:
                self.add([], name)

        for group in self.groups.values():
            group.approved_by = [person for person in group.people if person.lower() in self.approved]
            group.waived = group.role == "maintainers" and not group.people

        if not self.maintainers:
            self.failures.insert(0, "governance.toml lists no maintainers")
        pending = [group for group in self.groups.values() if not group.done]
        if self.failures:
            state, description = "failure", self.failures[0]
        elif pending or self.waiting:
            parts = [either(group.people) for group in pending] + [f"@{who}" for _, who in self.waiting]
            state, description = "pending", "Waiting for " + "; ".join(dict.fromkeys(parts))
        elif not self.groups:
            state, description = "success", "Only generated pages changed; tools/check.py compares them with their sources"
        elif all(group.waived for group in self.groups.values()):
            state, description = "success", "No reviewer but the author, who is the only maintainer"
        else:
            state, description = "success", "Approved by someone who covers each change"
        if len(description) > MAX_DESCRIPTION:
            description = description[: MAX_DESCRIPTION - 3].rstrip() + "..."

        # Ask everyone who can unblock a pending group and has not reviewed yet, and ask again the
        # person who verifies a card, whose approval has to be on the last commit.
        request = []
        candidates = [(p, False) for group in pending for p in group.people] + [(who, True) for _, who in self.waiting]
        for person, again in candidates:
            low = person.lower()
            if low != self.author.lower() and (again or low not in self.reviewed) and low not in {r.lower() for r in request}:
                request.append(person)
        return {
            "state": state,
            "description": description,
            "head_sha": self.head_sha,
            "request": request[:MAX_REQUESTED],
        }

    def comment(self, result: dict) -> str:
        lines = [MARKER, "### Moderation", ""]
        if result["state"] == "success":
            lines += ["Every change is covered.", ""]
        if self.groups:
            lines += ["| Changes | Who can approve | Status |", "|---|---|---|"]
        else:
            lines += ["Only generated pages changed."]
        for group in self.groups.values():
            if group.waived:
                who, status = "the author, the only maintainer", "no other reviewer"
            else:
                who = f"{mention(group.people)} ({group.role})"
                status = f"approved by {mention(group.approved_by)}" if group.approved_by else "waiting"
            lines.append(f"| {listed(group.covers)} | {who} | {status} |")
        if self.failures or self.waiting:
            lines += ["", "Evidence cards marked verified:", ""]
            lines += [f"- {failure}" for failure in self.failures]
            lines += [f"- {what}." for what, _ in self.waiting]
        lines += [
            "",
            f"The rules are in [GOVERNANCE.md]({atlas.GOVERNANCE_URL}). The moderation check updates this comment.",
        ]
        return "\n".join(lines) + "\n"


FORM_HEADING = re.compile(r"^###[ \t]+(.+?)[ \t]*$", re.M)


def form_fields(body: str) -> dict[str, str]:
    """The answers of an issue form: GitHub writes each one under a '### Label' heading."""
    parts = FORM_HEADING.split(body or "")
    return {parts[i].strip(): parts[i + 1].strip() for i in range(1, len(parts) - 1, 2)}


def issue_domain(body: str) -> dict:
    fields = form_fields(body)
    named_language = fields.get("Language", "").strip().strip("`").lower()
    if named_language:
        for lang in i18n.languages().values():
            if named_language in (lang.id, lang.tag.lower(), lang.name.lower(), lang.english_name.lower()):
                return {
                    "domain": None,
                    "name": lang.english_name,
                    "label": f"lang: {lang.id}",
                    "role": "Maintainers",
                    "moderators": handles(lang.maintainers),
                }
        return {"domain": None}
    domains = atlas.taxonomy().domains
    domain_id = fields.get("Domain", "").strip()
    if domain_id not in domains:
        named = fields.get("Technology", "").strip().strip("`").lower()
        techs = atlas.technologies()
        if named in techs:
            domain_id = techs[named].domain
        else:
            domain_id = next((t.domain for t in techs.values() if t.name.lower() == named), "")
    if domain_id not in domains:
        return {"domain": None}
    return {
        "domain": domain_id,
        "name": domains[domain_id]["name"],
        "label": f"domain: {domain_id}",
        "role": "Moderators",
        "moderators": handles(domains[domain_id].get("moderators", [])),
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)
    pr = sub.add_parser("pr", help="evaluate a pull request fetched by the moderation workflow")
    pr.add_argument("--dir", type=Path, required=True)
    issue = sub.add_parser("issue", help="find the domain or the language of an issue opened from a form")
    issue.add_argument("--body-file", type=Path, required=True)
    args = parser.parse_args(argv)

    if args.command == "issue":
        print(json.dumps(issue_domain(args.body_file.read_text(encoding="utf-8"))))
        return 0

    request = PullRequest(args.dir)
    result = request.evaluate()
    comment = request.comment(result)
    (args.dir / "result.json").write_text(json.dumps(result, indent=1) + "\n", encoding="utf-8")
    (args.dir / "comment.md").write_text(comment, encoding="utf-8")
    print(f"{result['state']}: {result['description']}")
    print(comment)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
