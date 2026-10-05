# 0010. A static site and a JSON export

- Date: 2026-10-04
- Status: accepted

## Context

The generated Markdown pages read well on GitHub but cannot show what the atlas is for: how far each
technology is from its target, and which shared dependencies hold several domains back. Models and
other tools also need the whole atlas in one file instead of a clone and a TOML parser.

## Decision

1. **One JSON export.** `tools/build_site.py` writes `atlas.json`: the taxonomy, every technology
   and evidence card, and the derived fields the pages compute (gap sizes, dependents, the gaps a
   technology holds open, citations). The format is versioned by a `schema` number and described in
   [docs/export.md](../export.md). Each export carries the commit it was built from.
2. **llms.txt.** The same build writes `llms.txt` (an index, https://llmstxt.org) and
   `llms-full.txt` (every technology and card as Markdown).
3. **A static explorer.** `site/` holds a page with no build step that reads `atlas.json`: an
   overview with the distance to target per technology, a dependency graph (Cytoscape.js from a
   CDN), filters over the gaps and the evidence, and a page per technology and per card. It follows
   The Alan Machine's typography and links to its pages.
4. **GitHub Pages, built by Actions.** `.github/workflows/pages.yml` runs `tools/check.py`, then
   the build, on every push to `main`, and deploys `_site/`. Nothing built is committed.
5. **The TOML stays the source.** The site and the export are views; corrections go to the TOML
   through a pull request, as before (decision 0002).

## Consequences

- The site is at https://scape-velocity.github.io/escape-velocity/ and is never more than one push
  behind `main`.
- A change to the export's fields that breaks readers raises `schema`.
- The hosted MCP server of stage 1 can serve `atlas.json` instead of a clone.
