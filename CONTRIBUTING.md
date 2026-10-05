# Contributing

Thank you for helping. Escape Velocity is only as good as its numbers and the people who check
them. You do not need to know the whole atlas: one sourced value, one gap, one dependency is a real
contribution.

This page is a step-by-step guide for a first contribution, followed by the rules every change
follows. The [Contribute page of the explorer](https://scape-velocity.github.io/escape-velocity/contribute/)
is a shorter introduction for readers who do not use git.

## Pick your path

| You have | Path | Start at |
|---|---|---|
| A source, a doubt or an idea, and no git | Fill in a form on GitHub; a curator or moderator turns it into a change | [Without git: the issue forms](#without-git-the-issue-forms) |
| A source and a GitHub account, and you can use a terminal | Edit the TOML yourself and open a pull request | [With git: step by step](#with-git-step-by-step) |
| Another language you read as well as English | Translate pages of the atlas or the interface | [Translating](#translating) |

With git you can also **map a technology**, taking one from `proposed` to `scoping` or `mapped`
(the `decompose-technology` skill), or **curate** one: become responsible for it
([Curators and moderators](#curators-and-moderators)).

## Without git: the issue forms

You need only a GitHub account. Each form asks for what a reviewer needs; the source is the part
that matters most.

| Form | Use it for |
|---|---|
| [Report evidence](https://github.com/scape-velocity/escape-velocity/issues/new?template=report-evidence.yml) | A paper, dataset or report with a number that updates the atlas |
| [Challenge a value](https://github.com/scape-velocity/escape-velocity/issues/new?template=challenge-value.yml) | A current value, target, limit, readiness level or gap you think is wrong, with your source |
| [Propose a technology](https://github.com/scape-velocity/escape-velocity/issues/new?template=propose-technology.yml) | A technology the atlas should track, or a dependency that has no file yet |
| [Translation](https://github.com/scape-velocity/escape-velocity/issues/new?template=translation.yml) | A wrong or missing translation, a term of a glossary, or an offer to translate |

Blank issues are off. Ideas that are not a proposal yet, and questions about the atlas, go to
[Discussions](https://github.com/scape-velocity/escape-velocity/discussions).

An issue opened from a form is labelled with its domain and mentions the domain's moderators, who
triage it ([GOVERNANCE.md](GOVERNANCE.md#moderators)).

## With git: step by step

### 1. Install what you need

- **Python 3.11 or later**, with no packages to install. The tools read TOML with the standard
  library, which older versions do not have. The `python3` that comes with macOS is older (3.9) and
  cannot run them; install a current one from [python.org](https://www.python.org/downloads/) or
  Homebrew. Check with:

  ```bash
  python3 --version
  ```

- **git** and a **GitHub account**.
- **Node.js 20.9 or later** only if you work on the explorer in `web/`
  ([web/README.md](web/README.md)). Contributing data never needs it.

### 2. Fork and clone

On [the repository](https://github.com/scape-velocity/escape-velocity), press **Fork** to make your
own copy. Then clone your fork and make a branch for one subject:

```bash
git clone https://github.com/<your-handle>/escape-velocity.git
cd escape-velocity
git checkout -b add-dac-cost-2025
```

### 3. Edit the TOML

The data is TOML; the pages are generated from it. Start new files from `templates/`, whose
comments explain every field:

| To | Edit | Start from |
|---|---|---|
| Add a source | `evidence/<key>.toml`, one card per source | `templates/evidence.toml` |
| Add a technology | `atlas/<domain>/<slug>.toml` | `templates/technology.toml` |
| Change a value, a gap or a dependency | the technology's `atlas/<domain>/<slug>.toml` | |
| Add a metric | `taxonomy/metrics.toml`, in the same pull request that first uses it | |

```bash
cp templates/evidence.toml evidence/<key>.toml
```

Before you edit:

- A current value cites an evidence card with a finding for that metric, in the metric's unit
  ([Evidence rules](#evidence-rules)).
- A target has a rationale: who set it, or why this value. A limit appears only where a physical
  law gives one, with the basis.
- Use only values from the taxonomy (`taxonomy/`). A new domain or readiness scale needs a
  decision.
- A dependency is a technology. If a technology needs something others would need too, give it its
  own file (as `proposed` if need be) and link it with `[[requires]]`, not as a gap.
- Do not edit the generated files: `STATUS.md`, the `.md` pages under `atlas/` and
  `evidence/README.md`.
- Out of scope: weapons, dual-use research of concern and medical advice
  ([decision 0001](docs/decisions/0001-purpose-and-scope.md)).

The skills in `skills/` describe the same procedures in detail, for people and agents:
`define-technology` to add a technology, `decompose-technology` to map its dependencies and gaps,
`assess-readiness` for a readiness level, `scout-literature` to search for sources.

### 4. Generate and check

From the repository root:

```bash
python3 tools/generate.py
python3 tools/check.py
```

`generate.py` rewrites the generated pages from the TOML. `check.py` must pass; each error names
the file and what is wrong, and it also fails when a generated page does not match the TOML.

If you added or changed an evidence card, check it against its source:

```bash
python3 skills/review-evidence/scripts/verify_evidence.py <key>
```

It resolves the identifier, compares the title, year and first author, and looks for every quote in
the abstract. Add `--write` to mark the passing cards `machine-checked`; it never marks a card
`verified`. If a card cannot pass (a source with no abstract online, for instance), say why in the
pull request.

### 5. Commit with a sign-off

```bash
git add evidence/<key>.toml atlas/<domain>/<slug>.toml atlas/<domain>/<slug>.md
git commit -s -m "data(direct-air-capture): update current cost"
git push origin add-dac-cost-2025
```

Add the generated pages that changed as well; `git status` lists them. The `-s` adds the sign-off
line ([Developer Certificate of Origin](#developer-certificate-of-origin)); every commit needs it.

### 6. Open the pull request

GitHub offers to open a pull request after the push. Give it a title in the
[form below](#commit-and-pull-request-titles) and fill in the template: what changes, the
technologies and cards touched, every value added or changed with its card, and which parts an agent
drafted, if any.

### 7. Review

The `moderation` check lists who can approve your change (a curator of the technology, a moderator
of its domain, a language maintainer or a maintainer), requests their review and keeps a comment
with that table. The `check` workflow runs `tools/check.py` and builds the explorer. Answer the
review with new commits on the same branch; they go into the same pull request.

### 8. Merge

When the checks pass and a reviewer who covers the change approves, a maintainer reads the final
diff and squash-merges the pull request: its title becomes the commit on `main`. The explorer is
rebuilt from `main` and your values appear on their pages.

## Translating

The atlas is written in English and translated by people who read both. The interface words are in
`web/src/i18n/<lang>.json`; the texts of the atlas are overlays under `i18n/<lang>/`, and
`tools/translate.py` writes their paths and fingerprints for you. The whole procedure, the glossary
and how to add a language are in [docs/translating.md](docs/translating.md). Translation pull
requests follow the steps above, with the title `translation(<lang>): <what>`, and are approved by
the language's maintainers.

## Evidence rules

- Every number has a source in an evidence card, with a verbatim quote of at most 60 words from the
  abstract (or the page, for a dataset or report).
- Numbers and units are written as the [SI Brochure](https://www.bipm.org/en/si-brochure-9)
  (BIPM, 9th edition, 2019, version 4.01 of June 2026) says: a space between the number and the
  unit, the digits of long numbers grouped in threes by a space, and a comma or a point as the
  decimal sign.
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
`moderation` check says who, requests their review and passes once one of them approves. Nobody
verifies their own card. Roles, terms, conflicts of interest and how to become one are in
[GOVERNANCE.md](GOVERNANCE.md).

## Commit and pull request titles

`type(scope): summary`, in the imperative, lowercase, without a final period, at most 72
characters. Pull requests are squash-merged, so the title becomes the commit.

| Type | For |
|---|---|
| `data` | Technology files: new technologies, values, gaps, dependencies |
| `evidence` | Evidence cards only |
| `taxonomy` | Domains, metrics, scales, vocabulary |
| `translation` | Translations under `i18n/` and `web/src/i18n/`; the scope is the language id |
| `skill` | Agent skills |
| `tools` | Generators, checks, literature clients |
| `web` | The explorer in `web/` |
| `docs` | Documentation and decisions |
| `fix` | Corrections of wrong values or broken tools |
| `chore` | Maintenance |

Examples: `data(fusion-power): add tritium breeding dependency`,
`evidence(google2024quantum): add decoder latency finding`,
`translation(pt): translate the climate domain`.

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
