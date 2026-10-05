---
name: review-evidence
description: Check Escape Velocity evidence cards against their sources (identifier, title, year, first author, and that every quote appears in the abstract) and mark the passing ones machine-checked. Use after writing or editing a card in evidence/, before a pull request that adds evidence, and when reviewing a pull request from another contributor or an agent.
---

# Review evidence

An evidence card is the only way a number enters the atlas. A wrong card is worse than none: the
number looks sourced.

## Check

```bash
V=skills/review-evidence/scripts/verify_evidence.py
python3 $V                          # every unverified card
python3 $V key1 key2 --show-abstract
python3 $V --write                  # mark the passing cards machine-checked
python3 tools/generate.py && python3 tools/check.py
```

The script checks that the DOI, arXiv id, PMID, NCT number or URL resolves; that the title, the
year and the first author match; and that each finding's quote appears in the abstract (or the page
text, for a dataset or report cited by URL). It ignores case, spacing, punctuation and LaTeX.

## When it fails

- **Year**: a paper online in December and in print in January has two years; the script accepts
  either. Any other mismatch means the card is wrong. The key carries the year: rename the file too.
- **Title or first author**: copy them from `search.py abstract`, never from memory. Organizations
  ("Google Quantum AI and Collaborators") are written as the source writes them.
- **Quote not found**: copy the quote again from `--show-abstract`. If the number is only in the
  body of the paper, the card cannot be machine-checked: leave it `unverified`, say on which page
  the number is, and ask a curator to verify it.
- **Value not in the quote**: a warning. It is fine when the card converts units (0.143% is
  `1.43e-3`; 63 microseconds is `6.3e-5` s); say the conversion in `conditions`. Otherwise the value
  is wrong.

## What machine-checked does not mean

The script proves the quote exists, not that the value means what the card says. Before you mark a
card `verified` (curators only, with `reviewed_by`), read the source and confirm:

1. the finding measures the metric as `taxonomy/metrics.toml` defines it;
2. the conditions are complete: the same number under other conditions is a different finding;
3. the class is right: a preprint, a press release or a single unreplicated result is `reported`;
4. the card's value is the one the technology file uses, in the metric's unit.

A card that does not hold up becomes `status = "rejected"` with a `note`, and stays in the
repository so it is not added again.
