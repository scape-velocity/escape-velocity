# Contributing

Thank you for helping. Escape Velocity is only as good as its numbers and the people who check
them. You do not need to know the whole atlas: one sourced value, one gap, one dependency is a real
contribution.

## Ways to help

- **Add evidence**: a measurement that updates a current value, with its source. Use the
  [report evidence](.github/ISSUE_TEMPLATE/report-evidence.yml) form or open a pull request.
- **Challenge a value**: a current value, a target or a limit you think is wrong. Use the
  [challenge a value](.github/ISSUE_TEMPLATE/challenge-value.yml) form, with your source.
- **Propose a technology**: use the [propose a technology](.github/ISSUE_TEMPLATE/propose-technology.yml)
  form, or write the file yourself following the `define-technology` skill.
- **Map a technology**: take one from `proposed` to `scoping` or `mapped` (see the
  `decompose-technology` skill).
- **Curate**: become responsible for a technology (below).

## How a change is made

1. Fork the repository and create a branch.
2. Edit the TOML: `atlas/<domain>/<slug>.toml`, `evidence/<key>.toml`, or `taxonomy/`. Start from
   `templates/` for new files.
3. Run:
   ```bash
   python3 tools/generate.py
   python3 tools/check.py
   python3 skills/review-evidence/scripts/verify_evidence.py   # if you added evidence
   ```
4. Commit with a sign-off and open a pull request using the template.

Only Python 3.11 or later is needed, with no packages to install. The `python3` that comes with
macOS is older and cannot read TOML; install a current one from python.org or Homebrew. Working on
the explorer in `web/` also needs Node.js ([web/README.md](web/README.md)).

## Evidence rules

- Every number has a source in an evidence card, with a verbatim quote of at most 60 words from the
  abstract (or the page, for a dataset or report).
- Values are stored in the metric's unit from `taxonomy/metrics.toml`; state any conversion in the
  finding's `conditions`.
- Preprints, company announcements and single unreplicated results are `reported`, not
  `established`.
- The full policy is [decision 0006](docs/decisions/0006-evidence-policy.md).

## Curators and moderators

A curator looks after one or more technologies: reviewing new evidence at least every six months,
keeping the gaps current and verifying cards (`status = "verified"`, `reviewed_by`). A moderator
looks after a domain. A technology with a curator can reach status `tracked`.

Your pull request needs an approval from a curator or moderator of what it changes; the
`moderation` check says who, requests their review and passes once one of them approves. Roles,
terms, conflicts of interest and how to become one are in [GOVERNANCE.md](GOVERNANCE.md).

## Commit and pull request titles

`type(scope): summary`, in the imperative, lowercase, without a final period, at most 72
characters. Pull requests are squash-merged, so the title becomes the commit.

| Type | For |
|---|---|
| `data` | Technology files: new technologies, values, gaps, dependencies |
| `evidence` | Evidence cards only |
| `taxonomy` | Domains, metrics, scales, vocabulary |
| `skill` | Agent skills |
| `tools` | Generators, checks, literature clients |
| `web` | The explorer in `web/` |
| `docs` | Documentation and decisions |
| `fix` | Corrections of wrong values or broken tools |
| `chore` | Maintenance |

Examples: `data(fusion-power): add tritium breeding dependency`,
`evidence(google2024quantum): add decoder latency finding`.

## Developer Certificate of Origin

Every commit must be signed off, certifying that you have the right to submit it under the
project's licenses ([developercertificate.org](https://developercertificate.org)):

```bash
git commit -s -m "data(direct-air-capture): update current cost"
```

The sign-off is a person's certification. If an AI assistant drafted part of a contribution, the
person who signs off has read it, checked its sources and takes responsibility for it.

## AI assistance

Agents are welcome as drafters. `AGENTS.md` holds their rules; the skills in `skills/` are the same
procedures people follow. Say in the pull request which parts an agent drafted. Agent-written cards
stay `unverified` or `machine-checked` until a curator verifies them.

## Licenses

By contributing you agree that data is released under CC0 1.0, text under CC BY 4.0 and code under
Apache 2.0 ([decision 0009](docs/decisions/0009-licenses.md)).
