# Governance

Who looks after each part of the atlas, who approves a pull request, and how to take a role. The
reasons are in [decision 0011](docs/decisions/0011-moderators-and-the-moderation-check.md).

## Roles

| Role | Looks after | Listed in |
|---|---|---|
| Maintainer | The whole repository: tools, taxonomy, decisions, workflows and the lists of people. Maintainers merge pull requests and handle conduct reports. | [`governance.toml`](governance.toml) |
| Moderator | A domain: its technologies, the evidence cards they cite and its issues. | `moderators` in [`taxonomy/domains.toml`](taxonomy/domains.toml) |
| Curator | One or more technologies, with the evidence cards they cite. | `curators` in the technology's TOML file |

People are listed by GitHub handle, without @. The lists change only through pull requests. The
names appear on the generated pages, on the [explorer](https://scape-velocity.github.io/escape-velocity/)
and in `atlas.json`.

Moderators and curators do not need write access. A maintainer gives them the triage role, so
GitHub can request their reviews and they can label and close issues. Their approval counts through
the `moderation` check, not through repository permissions.

## Who approves what

The required check `moderation` ([`.github/workflows/moderation.yml`](.github/workflows/moderation.yml),
[`tools/moderation.py`](tools/moderation.py)) reads the files a pull request changes. It passes when
each change has an approving review from someone who covers it:

| Change | Approved by |
|---|---|
| A technology file, `atlas/<domain>/<slug>.toml` | A curator of that technology or a moderator of its domain |
| A technology moved to another domain | Someone who covers the old domain and someone who covers the new one |
| A change to a technology's `curators` | A maintainer, as well as the above |
| An evidence card | A curator or moderator of any technology that cites the card, before or after the change |
| An evidence card that no technology cites | A maintainer |
| Anything else: tools, taxonomy, decisions, documentation, `governance.toml` | A maintainer |

- The curators and moderators counted are those on `main`, so nobody approves a change by adding
  themselves in the same pull request.
- The author's own approval does not count. If the author is the only person who covers a change, a
  maintainer approves it. If the author is the only maintainer and nobody else covers the change,
  the check passes; that happens only while the project has a single maintainer.
- An approval counts until the same person requests changes or the review is dismissed. It still
  counts after new commits, except for verification (below). The maintainer who merges reads the
  final diff.
- Generated pages are not counted. `tools/check.py` fails when they do not match the TOML.

On each pull request the check requests reviews from the people who can approve and, while it is
not passing, keeps a comment with a table of each change and who can approve it. A review re-runs
the check.

## Verifying an evidence card

Verifying means reading the source against every finding of the card: the value, the unit, the
conditions and the quote. To record it, set `status = "verified"` and `reviewed_by` to your handle.
The check accepts it when:

1. `reviewed_by` curates or moderates a technology that cites the card, or is a maintainer when no
   curator or moderator covers it;
2. `reviewed_by` is not the person in `added_by`; nobody verifies their own card;
3. `reviewed_by` approved the last commit of the pull request, or wrote the pull request.

`tools/check.py` warns when a verified card's reviewer no longer curates or moderates any
technology that cites it. The card stays verified; the next curator can review it again.

Agents never hold a role, never set `verified` or `reviewed_by`, and never add anyone to a list
([AGENTS.md](AGENTS.md)).

## Curators

A curator keeps their technologies current:

- reviews new evidence at least every six months for a `tracked` technology and every twelve months
  otherwise, and records the date in `last_reviewed` (`tools/check.py` warns when it is past due
  and names the curators);
- keeps the gaps and their status current;
- verifies cards, as above.

A technology needs at least one curator to reach status `tracked`.

## Moderators

A moderator looks after a domain:

- reviews pull requests on its technologies and on the cards they cite;
- triages its issues. An issue opened from a form gets the label `domain: <id>` and a comment
  mentioning the domain's moderators ([`.github/workflows/triage.yml`](.github/workflows/triage.yml));
- finds curators for the technologies that need one.

## Becoming one

Open an issue, or a pull request that adds your handle to the list, with:

- the domain or the technologies;
- your background in them, with a link others can check;
- any conflict of interest (below).

A maintainer approves the change, which the check requires for any change to a list, and then
gives you the triage role. A curator's first pull request should also review the technology file.

## Conflicts of interest

Declare your affiliations when you take a role, and update them when they change. Do not approve a
change or verify a card about your own work, your employer's products or a company you hold a stake
in. Leave it to another curator or moderator, or to a maintainer, and say so in the review.

## Stepping down and inactivity

Anyone can step down by removing their handle in a pull request. A maintainer removes a moderator or
curator who has not reviewed anything in the repository for twelve months, in a pull request that
mentions them. They can come back the same way they joined.

## Conduct

The [code of conduct](CODE_OF_CONDUCT.md) applies to everyone. Reports go to the maintainers, not to
moderators. A maintainer can remove a role from someone who breaks the code of conduct or these
rules.
