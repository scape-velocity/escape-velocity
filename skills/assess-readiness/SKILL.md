---
name: assess-readiness
description: Assess the readiness level of an Escape Velocity technology or of an approach to a gap on its scale (TRL, MRL, clinical drug or clinical device phases), with evidence for the level. Use when a technology moves to mapped, when new evidence suggests a higher or lower level, or when a pull request changes a readiness value.
---

# Assess readiness

Readiness says how far the best demonstration has come, on a published scale. It is a judgment;
the evidence makes it checkable.

## 1. Use the right scale

`taxonomy/readiness-scales.toml` has four: `trl` (NASA, 1 to 9), `mrl` (manufacturing, 1 to 10),
`clinical-drug` (discovery to standard of care) and `clinical-device`. The technology uses its
domain's scale unless the file sets `readiness_scale`. Read the meaning of each level; do not work
from the names alone.

## 2. Find the best demonstration

The level is set by the most advanced demonstration with evidence, not by the average of the field
or by an announcement. Ask of the best evidence card:

- What was demonstrated: a principle, a component, a system?
- In which environment: laboratory, relevant environment, operational?
- At which scale and for how long?

Take the highest level whose meaning the evidence fully meets. When it meets most of a level but not
all, take the level below and say what is missing in `readiness_note`.

## 3. Write it

```toml
readiness = 4
readiness_evidence = ["google2024quantum"]
readiness_note = "Below-threshold memory demonstrated; no error-corrected algorithm of practical value."
```

Approaches to a gap take a `readiness` on the same scale, with their evidence in the approach.

## 4. Be careful with

- **Press releases and company roadmaps**: evidence class `reported`; they can support a level only
  when the demonstration is described in enough detail to judge.
- **Clinical scales**: a trial registration shows a trial exists, not that it succeeded. Phase 3
  started is level "Phase 3"; approval needs the regulator's decision as evidence.
- **Downgrades**: a failed replication or a retraction lowers the level. Say why in the note.
