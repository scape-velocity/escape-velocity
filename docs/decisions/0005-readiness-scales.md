# 0005. Pluggable readiness scales

- Date: 2026-10-04
- Status: accepted

## Context

Technology readiness levels (TRL) fit hardware well and drugs badly. Medicine measures maturity by
clinical phases, devices by their regulatory path, manufacturing by its own scale. One scale for
all would mislabel half the atlas.

## Decision

1. Scales are data, in `taxonomy/readiness-scales.toml`, each with its source and the meaning of
   every level. At the start: `trl` (NASA, 1 to 9), `mrl` (manufacturing readiness, 1 to 10),
   `clinical-drug` (discovery to standard of care, 7 levels) and `clinical-device` (concept to
   standard of care, 6 levels).
2. Each domain has a default scale; a technology may set `readiness_scale` to another.
3. A readiness level is an integer on the scale, with `readiness_evidence` (cards) and an optional
   `readiness_note` saying what is missing for the next level. It is set by the best demonstrated
   result, not by announcements.
4. Approaches to a gap may carry a readiness on the same scale.

## Consequences

- Levels on different scales are not compared numerically; summaries show the level's name and
  "n of N".
- A new scale is a pull request to the taxonomy with its source, reviewed like any other data.
