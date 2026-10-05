# 0007. Agents, skills, scouting and an MCP server

- Date: 2026-10-04
- Status: accepted

## Context

Keeping the atlas current means reading new literature in thirteen domains every week. That is
work agents can help with, if they follow the same rules as people and every change they propose
is reviewed.

## Decision

1. **`AGENTS.md`** is the instruction file for any coding agent; `CLAUDE.md` imports it.
2. **Skills** in `skills/<name>/SKILL.md` (Agent Skills format), linked from `.claude/skills/`:
   `scout-literature`, `review-evidence`, `define-technology`, `decompose-technology`,
   `assess-readiness`, `find-neglected-gaps`, `cross-domain-transfer` and `weekly-brief`.
3. **Scouting is local-first.** `skills/scout-literature/scripts/search.py` queries open APIs
   (OpenAlex, arXiv, Crossref, PubMed, ClinicalTrials.gov, Semantic Scholar) with no key required
   and nothing personal sent. The shared clients are in `tools/literature.py`.
4. **Writes go through pull requests.** An agent drafts files and opens a pull request; a person
   reviews and merges. No agent merges, and no tool writes to the default branch.
5. **MCP server, read-only.** `tools/mcp_server.py` (standard library, stdio, registered in
   `.mcp.json`) serves the clone it runs in: `list_technologies`, `technology`, `gaps` (filtered
   by facet), `dependencies` (down or up), `bottlenecks`, `evidence`, `search_literature`,
   `abstract` and `count_literature`, with the atlas version and the license in every response.
   It shipped in stage 0; stage 1 adds a hosted copy serving the published JSON export.
6. **Scheduled scouting (stage 2)**: a workflow that runs the weekly brief and opens a pull request
   with proposed cards, never merging it.

## Consequences

- Agent output is held to the evidence policy (decision 0006); the verify script is the first
  reviewer, a curator the second.
- The scout's rate limits are those of the open APIs. Optional keys (`OPENALEX_API_KEY`,
  `NCBI_API_KEY`, `S2_API_KEY`) raise them and are read from the environment, never committed.
- On Windows, the links in `.claude/skills/` need `git config core.symlinks true`.
