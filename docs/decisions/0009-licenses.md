# 0009. Licenses

- Date: 2026-10-04
- Status: accepted

## Context

The atlas should be usable by anyone: researchers, companies, agencies, other open projects and
models. Code, data and prose have different needs.

## Decision

1. **Data** (`taxonomy/`, `atlas/*.toml`, `evidence/`): CC0 1.0. Facts are free; CC0 removes doubt
   about reuse in databases and training sets. Quotes in evidence cards remain the words of their
   authors, used in short form as citation.
2. **Text** (documentation, generated pages, skills): CC BY 4.0.
3. **Code** (`tools/`, skill scripts): Apache License 2.0, for its patent grant.
4. **Contributions** are signed off under the Developer Certificate of Origin. The sign-off is a
   human's certification; an agent does not sign off for anyone.

## Consequences

- `LICENSE` summarizes the split; `LICENSE-CODE` and `LICENSE-DATA` hold the full texts.
- A contribution that cannot be released under these licenses cannot be accepted.
