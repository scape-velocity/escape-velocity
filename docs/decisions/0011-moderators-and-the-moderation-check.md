# 0011. Moderators by domain and a moderation check

- Date: 2026-10-05
- Status: accepted

## Context

Every change is a pull request reviewed by a person (decision 0002), and only a person verifies an
evidence card (decision 0006). With one maintainer, that person reviews everything, including
domains far from their field. The atlas needs people who know a domain to review its changes,
without giving them write access to the whole repository.

GitHub's CODEOWNERS was the obvious tool and does not fit. A code owner needs write access to the
repository. Ownership is decided by path only, while evidence cards sit in one flat folder and a
card is often cited by technologies in several domains. And a code owner's approval cannot be tied
to a field inside a file, such as who verified a card.

## Decision

1. **Three roles.** Maintainers look after the repository and are listed in `governance.toml`.
   Moderators look after a domain and are listed in `moderators` in `taxonomy/domains.toml`.
   Curators look after technologies and are listed in `curators` in each technology file. People
   are named by GitHub handle; the lists change by pull request, approved by a maintainer.
2. **A moderation check instead of CODEOWNERS.** `.github/workflows/moderation.yml` runs
   `tools/moderation.py` on every pull request and on every review, and reports the commit status
   `moderation`, required on `main`. It passes when each changed file has an approving review from
   someone who covers it: a technology file from its curators or its domain's moderators; an
   evidence card from those of any technology that cites it; everything else, and any change to a
   list of people, from a maintainer. The lists counted are those on `main`.
3. **Verification is tied to the review.** A card marked `verified` needs `reviewed_by` to be
   someone who covers it, someone other than `added_by`, and someone who approved the pull
   request's last commit or wrote it.
4. **The check runs main's code on the pull request's data.** It uses `pull_request_target` and
   `workflow_run`, so it can write a status and a comment on pull requests from forks. It never
   runs code from the pull request: the TOML files it needs are fetched through the API and parsed.
5. **Roles without write access.** Moderators and curators get the triage role, so GitHub can
   request their reviews and they can triage issues. Only maintainers merge.
6. **Names are public.** Moderators appear on each domain page, curators on each technology page,
   both on the explorer and in `atlas.json`, with the maintainers.
7. **Terms.** Curators review tracked technologies every six months. Moderators and curators
   inactive for twelve months are removed and can return. Nobody approves or verifies their own
   work, their employer's products or a company they hold a stake in. The details are in
   [GOVERNANCE.md](../../GOVERNANCE.md).
8. **Issues are routed.** Issues opened from a form get a `domain: <id>` label and a comment
   mentioning the domain's moderators.

## Consequences

- A domain can grow without its changes waiting on one person, and the check says who can approve.
- While a domain has no moderators, its changes fall back to the maintainers, which is the current
  state.
- An approval survives later commits, except for verification. The maintainer who merges still
  reads the final diff.
- GitHub requests reviews only from collaborators, so a moderator without the triage role is
  mentioned in the comment instead.
- Changing the rules means changing `tools/moderation.py` on `main`; a pull request cannot loosen the
  check it is judged by.
