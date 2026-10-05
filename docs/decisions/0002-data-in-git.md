# 0002. Data in Git, TOML as the source, Markdown generated

- Date: 2026-10-04
- Status: accepted

## Context

The atlas must be reviewable line by line, citable at a fixed version, readable without tools and
writable by people and agents through the same process. A database with a web editor would hide
changes from review and make agents a special case.

## Decision

1. **The source of truth is TOML** in the repository: `taxonomy/` for the vocabulary,
   `atlas/<domain>/<slug>.toml` for technologies, `evidence/<key>.toml` for evidence cards.
   TOML because it has comments, dates and typed numbers, and Python reads it with the standard
   library.
2. **Pages are generated and committed**: `STATUS.md`, `atlas/<domain>/README.md`,
   `atlas/<domain>/<slug>.md` and `evidence/README.md`, by `tools/generate.py`. GitHub renders them,
   including the Mermaid dependency graphs, so the atlas is readable with no build step.
3. **One check**: `tools/check.py` validates the data against the taxonomy and fails when a
   generated page is out of date. CI runs it on every pull request.
4. **Standard library only.** The tools need Python 3.11 or later and nothing else.
5. **Every change is a pull request**, from people and agents alike (decision 0007).

## Consequences

- Generated pages appear in diffs. Reviewers read the TOML diff; the page diff shows the effect.
- A version of the atlas is a Git commit, which a paper or a dossier can cite.
- When the atlas outgrows Markdown pages, a static site and a JSON export will be generated from
  the same TOML (stage 1), without changing the source format.
