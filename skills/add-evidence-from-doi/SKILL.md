---
name: add-evidence-from-doi
description: Turn a paper you already have (a DOI or an arXiv id) into an evidence card in evidence/ of the Escape Velocity atlas, with its class and a verbatim quote, checked against the source. Use when someone brings a specific paper to add. To look for papers, use scout-literature; to check cards that already exist, use review-evidence.
---

# Add evidence from a DOI

The path of someone who already has the paper. To search the literature, use `scout-literature`;
to check existing cards or another contributor's pull request, use `review-evidence`.

## 1. Read the abstract

```bash
python3 skills/scout-literature/scripts/search.py abstract doi:<doi> --json
python3 skills/scout-literature/scripts/search.py abstract arxiv:<id> --json
```

Copy title, authors, year and venue from this output, never from memory.

## 2. Check it is not there already

```bash
grep -ril "<doi or arxiv id>" evidence/
```

If a card exists, add a finding to it instead of writing a second card.

## 3. Write the card

`evidence/<key>.toml`, key `authorYEARfirstword` as in the existing cards (first author's surname,
year, first word of the title that is not an article, all lowercase: `gidney2025how`). Follow the
format of `evidence/gidney2025how.toml`:

```toml
title = "..."
authors = ["Surname, Given"]
year = 2025
venue = "..."
type = "article"            # article, preprint, review or dataset
doi = "..."                 # or arxiv = "..."
class = "reported"
status = "unverified"
added = 2026-10-05
added_by = "agent:<model>"  # or the person's GitHub handle
note = "..."

[[finding]]
metric = "<metric id of taxonomy/vocabulary.toml>"
value = 0
unit = "<the metric's unit>"
conditions = "..."
quote = "<verbatim from the abstract, at most 60 words>"
```

Class by decision 0006 (`docs/decisions/0006-evidence-policy.md`): `established` for a
peer-reviewed measurement or a standard reference; `reported` for a preprint, a company or press
report, or a single unreplicated result; `extrapolation` for a projection under stated
assumptions. A preprint is never `established`.

The `quote` is copied literally from the abstract printed in step 1.

## 4. Verify

```bash
V=skills/review-evidence/scripts/verify_evidence.py
python3 $V <key> --show-abstract
python3 $V <key> --write            # marks it machine-checked when it passes
python3 tools/generate.py && python3 tools/check.py
```

If the quote is not found, copy it again from `--show-abstract`. If the number is only in the body
of the paper, leave the card `unverified` and say on which page it is (see `review-evidence`).
