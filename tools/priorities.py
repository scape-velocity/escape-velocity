"""Community priorities: one GitHub Discussion per technology, and the count of its votes.

    python3 tools/priorities.py sync [--dry-run]     open the Discussion each technology lacks
    python3 tools/priorities.py count --out FILE     write the vote count as JSON

A vote is a thumbs up on the opening post of a technology's Discussion in the "Priorities"
category (decision 0016). Votes rank what the community wants mapped next; they never change a
status, a readiness level, a claim class or a number. No login is written anywhere, only counts.

The token comes from GITHUB_TOKEN or GH_TOKEN; the repository from GITHUB_REPOSITORY
("owner/name") or atlas.REPO_URL. Without a token or without the category, both commands print a
warning and exit with 0, writing nothing: the category is created by hand in the repository's
settings, and the site builds without a count. Standard library only.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import atlas  # noqa: E402
from build_site import SITE_URL  # noqa: E402

API = "https://api.github.com/graphql"
CATEGORY = "Priorities"
MIN_ACCOUNT_AGE_DAYS = 30
SCHEMA_VERSION = 1
RULE = (
    "Votes rank what the community wants mapped next. "
    "They never change a status, a readiness level, a claim class or a number."
)


class GitHubError(Exception):
    pass


def warn(message: str) -> None:
    print(f"warning: {message}", file=sys.stderr)


def token() -> str | None:
    return os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or None


def repository() -> tuple[str, str]:
    """The owner and name of the repository: GITHUB_REPOSITORY, or the path of atlas.REPO_URL."""
    full = os.environ.get("GITHUB_REPOSITORY") or atlas.REPO_URL.rstrip("/").split("github.com/", 1)[1]
    owner, name = full.split("/", 1)
    return owner, name


def graphql(auth: str, query: str, variables: dict) -> dict:
    body = json.dumps({"query": query, "variables": variables}).encode()
    request = urllib.request.Request(
        API,
        data=body,
        headers={
            "Authorization": f"bearer {auth}",
            "Content-Type": "application/json",
            "User-Agent": "escape-velocity-priorities",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            reply = json.load(response)
    except urllib.error.HTTPError as error:
        raise GitHubError(f"GitHub answered {error.code}: {error.read().decode(errors='replace')[:300]}") from error
    except urllib.error.URLError as error:
        raise GitHubError(f"GitHub could not be reached: {error.reason}") from error
    if reply.get("errors"):
        raise GitHubError("; ".join(e.get("message", str(e)) for e in reply["errors"]))
    return reply["data"]


REPOSITORY_QUERY = """
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    id
    url
    discussionCategories(first: 100) { nodes { id name slug } }
  }
}
"""

DISCUSSIONS_QUERY = """
query($owner: String!, $name: String!, $category: ID!, $after: String) {
  repository(owner: $owner, name: $name) {
    discussions(first: 100, after: $after, categoryId: $category) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number
        title
        url
        reactions(content: THUMBS_UP, first: 100) {
          pageInfo { hasNextPage endCursor }
          nodes { createdAt user { createdAt } }
        }
      }
    }
  }
}
"""

REACTIONS_QUERY = """
query($owner: String!, $name: String!, $number: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    discussion(number: $number) {
      reactions(content: THUMBS_UP, first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { createdAt user { createdAt } }
      }
    }
  }
}
"""

CREATE_MUTATION = """
mutation($repository: ID!, $category: ID!, $title: String!, $body: String!) {
  createDiscussion(input: {repositoryId: $repository, categoryId: $category, title: $title, body: $body}) {
    discussion { url }
  }
}
"""


def find_category(auth: str, owner: str, name: str) -> tuple[dict, dict | None]:
    """The repository (id, url) and its "Priorities" category, or None when it does not exist."""
    repo = graphql(auth, REPOSITORY_QUERY, {"owner": owner, "name": name})["repository"]
    if repo is None:
        raise GitHubError(f"repository {owner}/{name} not found")
    for category in repo["discussionCategories"]["nodes"]:
        if category["name"] == CATEGORY:
            return repo, category
    return repo, None


def no_category(repo: dict) -> str:
    return (
        f'the discussion category "{CATEGORY}" does not exist in {repo["url"]}. '
        "A maintainer creates it in Settings > Discussions; until then there are no votes to count."
    )


def discussions(auth: str, owner: str, name: str, category_id: str) -> list[dict]:
    """Every Discussion of the category, each with all its thumbs-up reactions."""
    found: list[dict] = []
    after = None
    while True:
        page = graphql(auth, DISCUSSIONS_QUERY, {"owner": owner, "name": name, "category": category_id, "after": after})
        block = page["repository"]["discussions"]
        for node in block["nodes"]:
            reactions = list(node["reactions"]["nodes"])
            info = node["reactions"]["pageInfo"]
            while info["hasNextPage"]:
                more = graphql(
                    auth,
                    REACTIONS_QUERY,
                    {"owner": owner, "name": name, "number": node["number"], "after": info["endCursor"]},
                )["repository"]["discussion"]["reactions"]
                reactions.extend(more["nodes"])
                info = more["pageInfo"]
            found.append({"number": node["number"], "title": node["title"], "url": node["url"], "reactions": reactions})
        if not block["pageInfo"]["hasNextPage"]:
            return found
        after = block["pageInfo"]["endCursor"]


def open_technologies() -> dict[str, atlas.Technology]:
    """The technologies that get a Discussion: every one that is not retired."""
    return {tech_id: tech for tech_id, tech in atlas.technologies().items() if tech.status != "retired"}


def discussion_body(tech: atlas.Technology) -> str:
    return (
        f"**{tech.name}** (`{tech.id}`)\n\n"
        f"Its page in the explorer: {SITE_URL}tech/{tech.id}/\n\n"
        "React with a thumbs up to this post to vote for mapping this technology next. "
        "One vote per account; accounts created less than "
        f"{MIN_ACCOUNT_AGE_DAYS} days before the vote are not counted.\n\n"
        f"> {RULE}\n\n"
        "This discussion was opened by `tools/priorities.py` (decision 0016). Keep its title: it is "
        "the technology's id, and the count reads it."
    )


def sync(dry_run: bool) -> int:
    techs = open_technologies()
    auth = token()
    if not auth:
        warn("no GITHUB_TOKEN or GH_TOKEN; nothing synced.")
        return 0
    owner, name = repository()
    repo, category = find_category(auth, owner, name)
    if category is None:
        warn(no_category(repo))
        if dry_run:
            print(f"Once the category exists, sync would open {len(techs)} discussions:")
            for tech_id in sorted(techs):
                print(f"  would create: {tech_id}")
        return 0
    existing = {d["title"] for d in discussions(auth, owner, name, category["id"])}
    missing = [tech_id for tech_id in sorted(techs) if tech_id not in existing]
    if not missing:
        print(f"Every technology has its discussion in {CATEGORY} ({len(techs)}).")
        return 0
    for tech_id in missing:
        if dry_run:
            print(f"would create: {tech_id}")
            continue
        created = graphql(
            auth,
            CREATE_MUTATION,
            {"repository": repo["id"], "category": category["id"], "title": tech_id, "body": discussion_body(techs[tech_id])},
        )
        print(f"created: {tech_id} {created['createDiscussion']['discussion']['url']}")
    verb = "would create" if dry_run else "created"
    print(f"{len(missing)} {verb}, {len(techs) - len(missing)} already open.")
    return 0


def parse_time(value: str) -> dt.datetime:
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))


def tally(reactions: list[dict]) -> tuple[int, int]:
    """Votes and reactions excluded for a new account. A reaction without a user (a deleted
    account) is dropped and not reported."""
    votes = excluded = 0
    for reaction in reactions:
        user = reaction.get("user")
        if not user or not user.get("createdAt"):
            continue
        age = parse_time(reaction["createdAt"]) - parse_time(user["createdAt"])
        if age < dt.timedelta(days=MIN_ACCOUNT_AGE_DAYS):
            excluded += 1
        else:
            votes += 1
    return votes, excluded


def count(out: Path) -> int:
    auth = token()
    if not auth:
        warn(f"no GITHUB_TOKEN or GH_TOKEN; {out} not written.")
        return 0
    owner, name = repository()
    repo, category = find_category(auth, owner, name)
    if category is None:
        warn(no_category(repo) + f" {out} not written.")
        return 0
    known = open_technologies()
    rows = []
    for discussion in discussions(auth, owner, name, category["id"]):
        if discussion["title"] not in known:  # not a technology id, or a retired technology
            continue
        votes, excluded = tally(discussion["reactions"])
        rows.append({"id": discussion["title"], "votes": votes, "excluded_new_accounts": excluded, "discussion": discussion["url"]})
    rows.sort(key=lambda row: (-row["votes"], row["id"]))
    result = {
        "schema": SCHEMA_VERSION,
        "counted_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "rule": RULE,
        "min_account_age_days": MIN_ACCOUNT_AGE_DAYS,
        "category_url": f"{repo['url']}/discussions/categories/{category['slug']}",
        "technologies": rows,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{out}: {len(rows)} technologies, {sum(r['votes'] for r in rows)} votes.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    sync_parser = commands.add_parser("sync", help="open the Discussion each technology lacks")
    sync_parser.add_argument("--dry-run", action="store_true", help="list what would be created, create nothing")
    count_parser = commands.add_parser("count", help="write the vote count as JSON")
    count_parser.add_argument("--out", required=True, help="the JSON file to write, such as _site/priorities.json")
    args = parser.parse_args(argv)
    try:
        if args.command == "sync":
            return sync(args.dry_run)
        return count(Path(args.out))
    except GitHubError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
