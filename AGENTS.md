# Instructions for AI agents

This file is for coding agents that work in this repository (Claude Code, Codex, Cursor and
others). Humans should start with [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md);
everything here is consistent with them.

## What this repository is

Escape Velocity: an open atlas of what each technology needs to reach maturity. Technologies form
a dependency graph; each has metrics (current, target, physical limit), gaps and evidence. The data
is TOML; the pages are generated. The model is explained in [docs/model.md](docs/model.md).

| Path | What it holds |
|---|---|
| `atlas/<domain>/<slug>.toml` | One technology. Its id is `<domain>/<slug>` |
| `atlas/<domain>/<slug>.md`, `atlas/<domain>/README.md`, `STATUS.md` | Generated pages |
| `evidence/<key>.toml` | One evidence card per source |
| `taxonomy/` | Domains, readiness scales, metrics, controlled vocabulary, SDGs |
| `templates/` | Commented starting points for a technology and an evidence card |
| `tools/` | `generate.py`, `check.py`, shared `atlas.py` and `literature.py`, the read-only `mcp_server.py` |
| `skills/` | Agent skills, linked from `.claude/skills/` |
| `docs/decisions/` | Why the project is the way it is |

## Rules that are easy to break

1. **Never write a number, a reference or a quote from memory.** Find the source with
   `python3 skills/scout-literature/scripts/search.py`, read it with `search.py abstract <id>`, and
   copy from that output. If you cannot find a source, say so and leave the value out.
2. **Every current value cites an evidence card** with a finding for that metric, in the metric's
   unit. Write cards as `status = "unverified"` and `added_by = "agent:<model>"`, then run
   `python3 skills/review-evidence/scripts/verify_evidence.py <keys> --write`. Never set
   `verified`; that is a curator's act.
3. **Every target has a rationale**: who set it, or why this value. Limits only where a physical law
   gives one, with the basis.
4. **Do not edit generated files** (`STATUS.md`, the `.md` pages under `atlas/`,
   `evidence/README.md`). Edit the TOML and run `python3 tools/generate.py`.
5. **Use only values from the taxonomy.** A new metric goes in `taxonomy/metrics.toml` in the same
   pull request that first uses it; a new domain or readiness scale needs a decision.
6. **A dependency is a technology.** If a technology needs something that others would need too,
   write it as its own file (as `proposed` if need be) and link it with `[[requires]]`, not as a
   gap. See the `decompose-technology` skill.
7. **Scope.** No weapons, no dual-use research of concern, no medical advice
   ([decision 0001](docs/decisions/0001-purpose-and-scope.md)).
8. **English only**: data, text, comments, commit messages, issues and pull requests.

## Before you finish

```bash
python3 tools/generate.py
python3 tools/check.py
```

`tools/check.py` must pass. It needs only Python 3.11 or later.

## Commits and pull requests

- Title: `type(scope): summary`, imperative, lowercase, no final period, at most 72 characters.
  Types: `data`, `evidence`, `taxonomy`, `skill`, `tools`, `docs`, `fix`, `chore`. The scope is the
  technology id's slug, the domain or the tool. See [CONTRIBUTING.md](CONTRIBUTING.md#commit-and-pull-request-titles).
- Every commit is signed off (`git commit -s`) by the human contributor responsible for it. The
  sign-off is a human's certification; an agent does not certify on anyone's behalf.
- Fill in the pull request template, listing the values added or changed and their cards.

## Skills

| Skill | Use it to |
|---|---|
| [`scout-literature`](skills/scout-literature/SKILL.md) | Search the open literature for work that closes a gap |
| [`review-evidence`](skills/review-evidence/SKILL.md) | Check evidence cards against their sources |
| [`define-technology`](skills/define-technology/SKILL.md) | Add a technology, as proposed or scoping |
| [`decompose-technology`](skills/decompose-technology/SKILL.md) | Map dependencies and gaps |
| [`assess-readiness`](skills/assess-readiness/SKILL.md) | Set a readiness level with evidence |
| [`find-neglected-gaps`](skills/find-neglected-gaps/SKILL.md) | Find bottlenecks many depend on and few research |
| [`cross-domain-transfer`](skills/cross-domain-transfer/SKILL.md) | Borrow approaches from other domains, as speculation |
| [`weekly-brief`](skills/weekly-brief/SKILL.md) | Summarize what is new for mapped technologies |
