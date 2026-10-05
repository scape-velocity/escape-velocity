# 0006. Evidence policy

- Date: 2026-10-04
- Status: accepted

## Context

The atlas is only as good as its numbers. Agents will write much of the first draft, and language
models invent references and misquote values. The policy has to make a wrong number hard to add
and easy to find.

## Decision

1. **Every number enters through an evidence card** in `evidence/<key>.toml`: one card per source,
   key `authorYEARfirstword`, with the bibliographic data, an identifier (DOI, arXiv id, PMID, NCT
   number, or URL with an access date) and one or more findings. Each finding has the metric, the
   value in the metric's unit, the conditions, and a verbatim quote of at most 60 words.
2. **Class**, mirroring The Alan Machine: `established` (peer-reviewed measurement or standard
   reference), `reported` (preprint, company or press report, single unreplicated result),
   `extrapolation` (projection under stated assumptions) and `speculation`. A preprint is never
   established.
3. **Status**: `unverified` when added; `machine-checked` when
   `skills/review-evidence/scripts/verify_evidence.py` confirms that the identifier resolves, the
   title, year and first author match, and every quote appears in the abstract; `verified` only when
   a curator has read the source and confirmed every finding (`reviewed_by`); `rejected` when the
   source does not support the card, kept so it is not added again.
4. **What a value may cite.** A technology's current value must cite a card with a finding for
   that metric; `check.py` enforces it and warns when the values differ.
5. **Agents** may write cards only as `unverified`, with `added_by = "agent:<model>"`. Nothing in
   the atlas is cited from memory.
6. **Cited by** is computed from the technology files, so a card never lists its users.

## Consequences

- Machine-checked is a floor, not a certificate: it proves the quote exists, not that the value
  means what the card says. The page shows each card's status next to the number.
- Numbers found only in the body of a paper stay unverified until a curator checks them, which
  slows the atlas down on purpose.
- Quotes are short and come from abstracts, which keeps them within fair use.
