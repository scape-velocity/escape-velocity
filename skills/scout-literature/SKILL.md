---
name: scout-literature
description: Search the open scientific literature (OpenAlex, arXiv, Crossref, PubMed, ClinicalTrials.gov, Semantic Scholar) for recent work that could close a gap in the Escape Velocity atlas, and turn what is relevant into evidence cards. Use when asked what is new for a technology or a gap, when filling a technology's current value, when looking for approaches to a gap, or before a weekly brief.
---

# Scout the literature

The scout reads; it does not decide. It finds candidate papers, reads their abstracts and proposes
evidence cards and approaches. A curator decides what goes into the atlas.

Nothing in this skill may be done from memory. A paper you remember but cannot find through the
script does not exist for the atlas.

## 1. Know what you are looking for

Read the technology file (`atlas/<domain>/<slug>.toml`), not only the generated page. Note:

- the headline metric, its current value and its date, and the target;
- the open gaps, their type and severity. The scout looks for papers on gaps of type
  `scientific-unknown`, `engineering`, `fundamental-limit` and `data`. For `cost`, `regulation`,
  `manufacturing` and `supply-chain`, look for reports instead and say so;
- the `search_terms` of the technology and of each gap.

## 2. Search

```bash
S=skills/scout-literature/scripts/search.py
python3 $S search --tech quantum/fault-tolerant-quantum-computer --since 2025
python3 $S search "magic state cultivation" --since 2024 --arxiv-cat quant-ph
python3 $S search "base editing in vivo delivery" --source pubmed --source trials --since 2024
python3 $S count "room temperature superconductor" --from 2015
```

- `--tech` takes the queries from the file and the sources from the domain
  (`taxonomy/domains.toml`). Results already cited in `evidence/` are marked `[in atlas]`.
- Default sources are OpenAlex and arXiv. Add `pubmed` and `trials` for health, biotech and
  neurotech; `crossref` finds publisher records OpenAlex misses; `s2` needs `S2_API_KEY` to avoid
  rate limits.
- Rewrite queries the way the field writes: "logical error per cycle" finds more than
  "quantum error rate". Try two or three phrasings before concluding there is nothing.
- arXiv allows one request every three seconds; the script waits. If arXiv refuses, the script
  falls back to OpenAlex for abstracts.

## 3. Read before you judge

For each candidate worth a look:

```bash
python3 $S abstract doi:10.1038/s41586-024-08449-y
python3 $S abstract arxiv:2505.15917
```

Judge from the abstract, never from the title. A candidate is relevant when it reports a number for
one of the technology's metrics, a new approach to an open gap, or a limit that changes a target.
Record for each: what it shows, under which conditions, how it compares with the current value.

## 4. Propose

- **A better current value**: write an evidence card (`templates/evidence.toml`) with a finding for
  the metric, quoting the abstract verbatim, and propose the new `current` in the technology file.
  Keep the old value as a `[[metric.history]]` entry.
- **A new approach to a gap**: add a `[[gap.approach]]` with the card as evidence. Readiness of an
  approach is on the technology's scale; when unsure, leave it out.
- **A dependency the atlas lacks**: use `decompose-technology`.

Every card you write starts as `status = "unverified"` and `added_by = "agent:<model>"`. Then run
`review-evidence`. A preprint is `class = "reported"`, never `established`.

## 5. Report

List what you searched (queries, sources, years), what you found relevant and why, what you wrote,
and what you looked for and did not find. "Nothing new since the last review" is a useful result.
