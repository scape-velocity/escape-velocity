# The explorer

The Escape Velocity explorer: a Next.js application in TypeScript, exported as static files and
published on GitHub Pages ([decision 0012](../docs/decisions/0012-explorer-in-next.md)). It has one
page per technology, evidence card and domain, plus the overview, the dependency graph, the gaps,
the evidence list, the about page and the contribute page.

It reads `atlas.json` at build time and nothing else, so build the data first. Contributing data
needs only Python; working on the interface needs Node.js 20.9 or later (the workflows use 24).

## Run it

From the repository root:

```bash
python3 tools/build_site.py      # writes _site/atlas.json, llms.txt and llms-full.txt
cd web
npm ci
npm run dev                      # http://localhost:3000
```

## Build it

```bash
npm run typecheck
npm run build                    # writes web/out/
cp -R out/. ../_site/            # the site as Pages serves it: the pages next to the data files
```

| Variable | Default | |
|---|---|---|
| `ATLAS_JSON` | `../_site/atlas.json` | The export to read, relative to `web/` |
| `PAGES_BASE_PATH` | empty | The path the site is served under; the Pages workflow sets `/escape-velocity` |

Canonical and Open Graph URLs always come from the `site` field of `atlas.json`.

## Where things are

| Path | |
|---|---|
| `src/app/` | One folder per route; `layout.tsx` holds the header, the footer, the theme and the redirect of old `#/` links |
| `src/components/` | The blocks of the views; `Graph.tsx`, `GraphExplorer.tsx`, `FilteredList.tsx`, `Nav.tsx` and `ThemeToggle.tsx` run in the browser |
| `src/lib/` | The `atlas.json` types (`docs/export.md`), the loader and the formatting helpers |
| `src/app/globals.css` | Every style, with the light and dark tokens |
