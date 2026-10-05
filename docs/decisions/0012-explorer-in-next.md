# 0012. The explorer in Next.js, one page per technology and card

- Date: 2026-10-05
- Status: accepted; supersedes item 3 of decision 0010

## Context

The explorer of decision 0010 is a single page with routes after a hash (`#/tech/<id>`). The
address after `#` never reaches a server, so search engines index one page and link previews on
chat and social sites show the overview's title for every technology and card. The title of each
view existed only after the script ran. With 35 technologies and 52 evidence cards, and more to
come, most of the atlas could not be found or shared on its own.

Rendering one HTML file per view from `tools/build_site.py` would fix that without a new toolchain,
but every view would then be drawn twice: as HTML strings in Python at build time and again by the
browser script for filters and the graph.

## Decision

1. **Next.js for the interface only.** `web/` holds a Next.js application in TypeScript, exported
   as static files (`output: "export"`) and published on GitHub Pages. The same component renders
   the HTML at build time and runs the filters and the graph in the browser. It replaces `site/`.
2. **Python keeps the data.** `tools/check.py`, `tools/generate.py`, `tools/moderation.py`, the MCP
   server and the skills stay in Python with the standard library (decision 0002).
   `tools/build_site.py` writes `atlas.json`, `llms.txt` and `llms-full.txt`; the interface reads
   `atlas.json` at build time and nothing else. The export's format and its `schema` number are
   still the contract (decision 0010).
3. **One address per view.** `/domain/<id>/`, `/tech/<domain>/<slug>/`, `/evidence/<key>/`,
   `/graph/`, `/gaps/`, `/evidence/` and `/about/`, each with its own title, description and Open
   Graph tags, listed in `sitemap.xml`. Filters stay in the query string. Old links with `#/` are
   redirected to the new address.
4. **Light and dark themes.** Colors are tokens; the dark set applies when the system asks for it
   or the reader picks it, and the choice is applied before the first paint.
5. **Node only for the interface.** Contributing data still needs only Python 3.11 or later. Working
   on the interface needs Node.js as well.
6. **Built by Actions.** `.github/workflows/pages.yml` runs the check, `tools/build_site.py` and the
   Next.js build, and deploys the result. The check workflow builds the interface on every pull
   request, so a change to the data that breaks a page fails before it reaches `main`.

## Alternatives considered

- **Static HTML from `tools/build_site.py`.** Rejected: two renderers of the same view, one in
  Python strings and one in the browser script.
- **Astro.** It ships less JavaScript for a site that is mostly static. Next.js won because the
  maintainers already build and run it in other projects.

## Consequences

- Every technology, card and domain has an address that search engines index and link previews
  read.
- The interface has dependencies to keep current, in `web/package.json`.
- GitHub Pages serves files only: no API routes, server rendering on request or image optimization.
  Anything that needs a server, such as the hosted MCP server of stage 1, needs a different host
  and its own decision.
