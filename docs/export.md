# The JSON export

`python3 tools/build_site.py` writes `_site/atlas.json`, published at
https://scape-velocity.github.io/escape-velocity/atlas.json on every push to `main`
([decision 0010](decisions/0010-static-site-and-json-export.md)). It holds the whole atlas in one
file, with the fields the pages derive already computed.

The data is CC0 1.0 and the text CC BY 4.0. Cite the `version` you used.

## Top level

| Field | |
|---|---|
| `schema` | Format version, an integer. Raised when a change breaks readers. Currently 1. |
| `version` | Short commit hash the export was built from |
| `version_date` | Date of that commit |
| `license` | `data`, `text`, `code` and a one-line `note` |
| `repository`, `site`, `alan_machine` | URLs |
| `governance` | `maintainers`, a list of GitHub handles, and `url`, the page that explains the roles |
| `taxonomy` | `domains`, `metrics`, `readiness_scales`, `sdgs` and `vocabulary`, as in `taxonomy/*.toml`. Each domain carries `moderators`, a list of GitHub handles. |
| `technologies` | One object per technology, below |
| `evidence` | One object per evidence card, below |

`vocabulary` maps each controlled field (`technology_status`, `gap_status`, `gap_type`, `layer`,
`severity`, `evidence_class`, `evidence_status`, `evidence_type`) to a list of `{id, meaning}`.

## Technologies

Every field of the technology's TOML file, with dates as ISO strings, plus:

| Field | |
|---|---|
| `id`, `domain` | `<domain>/<slug>` and the domain id |
| `readiness_name` | The readiness level in words, such as "TRL 4 (4 of 9)", or "not assessed" |
| `metrics` | The `[[metric]]` tables, each with `gap_to_target`, `target_to_limit` and `display` |
| `gaps` | The `[[gap]]` tables |
| `requires` | The `[[requires]]` tables |
| `required_by` | The `[[requires]]` tables of other technologies that point here, each with its `technology` |
| `blocks` | Gaps of other technologies whose `blocked_by` names this one: `technology`, `gap`, `title` |
| `dependents` | Every technology that depends on this one, directly or through others |
| `dependent_domains` | The domains of those dependents, other than this technology's own |
| `worst_open_severity` | The highest severity among gaps not closed, or null |
| `evidence` | Keys of every card the technology cites |
| `source`, `page` | The TOML file and the generated page on GitHub |
| `alan_machine` | Pages of The Alan Machine, each with `page`, `title` and `url` |

### Metric fields

| Field | |
|---|---|
| `gap_to_target` | Distance from the current value to the target in the direction of progress: orders of magnitude for metrics on a log scale, the difference in the metric's unit for linear ones. Zero or less means met. Null when either value is missing. |
| `target_to_limit` | The same distance from the target to the physical limit. Negative means the target lies beyond the limit. |
| `display` | `current`, `target`, `limit`, `gap_to_target` and `target_to_limit` formatted as on the pages, such as "1.43 × 10⁻³" or "9.2 orders of magnitude" |

## Evidence cards

Every field of the card's TOML file, with dates as ISO strings, plus:

| Field | |
|---|---|
| `key` | The file name without `.toml`, the key technologies cite |
| `link` | A resolvable URL: the DOI, arXiv, PubMed or ClinicalTrials.gov page, or the card's `url` |
| `cited_by` | Ids of the technologies that cite the card |
| `source` | The TOML file on GitHub |

A card's `status` says how far it has been checked: `unverified` and `machine-checked` cards have
not been reviewed by a curator (decision 0006).

## Also built

- `llms.txt`: an index of the atlas for language models, following https://llmstxt.org
- `llms-full.txt`: every technology and evidence card as plain Markdown
