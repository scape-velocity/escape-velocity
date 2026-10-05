# 0004. Three numbers per metric: current, target, limit

- Date: 2026-10-04
- Status: accepted

## Context

"How far is this technology?" needs a distance, and a distance needs two points and a unit. Some
targets also run into physics: no amount of engineering takes a process below its thermodynamic
minimum. A map that does not show the limit invites targets that cannot be met.

## Decision

1. Each metric of a technology has up to three numbers:
   - **current**: the best demonstrated value, with its date (`as_of`) and an evidence card;
   - **target**: the value at which the technology does what its statement says, with a
     rationale (who set it or why) and evidence when there is any;
   - **limit**: the physical bound, when a law gives one, with its basis.
2. **Gap to target** is shown in orders of magnitude for metrics that span many (scale `log`) and as
   a difference for bounded ones (scale `linear`). **Target to limit** shows the headroom; a target
   beyond the limit must have a gap with status `beyond-limit`, and `check.py` enforces it.
3. **One headline metric** per technology, from scoping on, is the one shown in summaries.
4. Each metric is defined once in `taxonomy/metrics.toml` with its unit, the direction that counts
   as better and its scale. Values are stored in that unit.
5. Earlier values may be kept as `[[metric.history]]` entries for trends.

## Consequences

- Comparing technologies across domains becomes possible on one axis: orders of magnitude to go.
- A metric depends on how it is measured. The conditions go with each finding in the evidence card
  and with the metric in the technology file; two values under different conditions are not compared.
- Targets are the most contestable number. The rationale makes them reviewable, and the
  "challenge a value" issue form exists for that.
