---
name: define-technology
description: Add a new technology to the Escape Velocity atlas, as proposed or scoping, with its statement, scope, domain, headline metric and target. Use when someone asks to track a technology the atlas does not have, when a dependency is named that has no file yet, or when opening a "propose a technology" issue.
---

# Define a technology

A technology in the atlas is a capability with a measurable target: "a fault-tolerant quantum
computer", "a blood test that finds cancer at stage I". Not a field ("quantum physics"), not a
product ("Willow"), not a company.

## 1. Check it is not there already

```bash
grep -ril "<words>" atlas/*/*.toml
```

If a close technology exists, extend it or make the new one a dependency of it. Two files for the
same capability split the evidence.

## 2. Place it

- **Domain**: the one whose community would review it (`taxonomy/domains.toml`). Cryogenics,
  power electronics, photonics, sensors and precision manufacturing go in `enablers`. A domain is
  where the file lives, not the only place it matters: the dependency graph crosses domains.
- **Slug**: lowercase words joined by hyphens, naming the capability, not the approach:
  `fault-tolerant-quantum-computer`, not `surface-code-superconducting`.
- **Readiness scale**: the domain's, unless the technology clearly belongs to another
  (`readiness_scale = "clinical-device"` for a diagnostic device in `biotech`).

## 3. Write the statement and the scope

- `statement`: one or two sentences saying what exists when the technology is done, in terms a
  non-specialist can check.
- `scope`: what is in, what is out, and which technology in the atlas covers the neighbours.

## 4. Choose the headline metric and the target

- Pick the one number that best says how far the technology is. Use a metric from
  `taxonomy/metrics.toml`; add one only if none fits, with id, name, meaning, unit, direction and
  scale, in the same pull request.
- The **target** needs a rationale: who set it (a roadmap, a regulator, an agency) or why this value
  (the threshold at which the use becomes possible). Cite the source when there is one.
- The **current value** needs an evidence card. Find it with `scout-literature`; check it with
  `review-evidence`. No card, no current value: leave the technology `proposed`.
- The **limit**, when a physical law bounds the metric, with its basis. Leave it out rather than
  guess.

## 5. Status

Start at `proposed` with name, statement and scope. Move to `scoping` when the headline metric has
a sourced current value and a target with rationale; add `last_reviewed`. The requirements of each
status are at the top of `templates/technology.toml`.

## 6. Finish

```bash
python3 tools/generate.py && python3 tools/check.py
```

Then `decompose-technology` to map what it depends on.
