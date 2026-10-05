# Tools

Python 3.11 or later, standard library only.

| Tool | What it does |
|---|---|
| `generate.py` | Writes `STATUS.md`, `atlas/<domain>/README.md`, `atlas/<domain>/<slug>.md` and `evidence/README.md` from the TOML. `--check` lists what is out of date without writing. |
| `check.py` | Validates the taxonomy, every technology and evidence card, the dependency graph (no cycles, no unknown ids) and that generated pages are current. Exit 1 on errors; warnings do not fail. |
| `atlas.py` | Shared loading and formatting: taxonomy, technologies, evidence, gap sizes, number formatting. |
| `literature.py` | Clients for OpenAlex, arXiv, Crossref, PubMed, ClinicalTrials.gov and Semantic Scholar, used by the skills. |
| `build_site.py` | Builds `_site/` for GitHub Pages: `atlas.json` ([format](../docs/export.md)), `llms.txt`, `llms-full.txt` and the explorer from `site/`. Run by `.github/workflows/pages.yml`; never committed. |
| `mcp_server.py` | Read-only MCP server on stdio over this clone: technologies, gaps, dependencies, bottlenecks, evidence and literature search. Claude Code loads it from `.mcp.json`. |

```bash
python3 tools/generate.py
python3 tools/check.py
python3 tools/build_site.py && python3 -m http.server 4173 --directory _site
```

Optional environment variables for the literature clients, never committed: `OPENALEX_API_KEY`,
`OPENALEX_MAILTO`, `NCBI_API_KEY`, `S2_API_KEY`.
