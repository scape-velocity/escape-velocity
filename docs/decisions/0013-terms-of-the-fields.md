# 0013. The terms of each field

- Date: 2026-10-05
- Status: accepted; supersedes the layer name `physics` in decision 0003

## Context

A metric is compared across technologies and over time, so one name has to mean one quantity. A
review of `taxonomy/` found names that held two quantities, names coined where the field already
has a term, and a vocabulary that disagreed with the evidence policy:

- `cost-per-tonne-co2` was defined as removal and durable storage, but one of its two cards gives
  the cost of capture without storage and the other the cost of net removal.
- `fusion-target-gain` used the inertial-confinement term for a quantity that magnetic confinement
  calls Q.
- `two-qubit-gate-error` accepted randomized benchmarking, which measures the average gate
  infidelity, and cycle benchmarking, which measures the process infidelity. For two qubits the
  first is 0.8 times the second.
- `energy-efficiency` and `communication-rate` left out the conditions without which two values
  cannot be compared: the arithmetic precision, and the vocabulary and word error rate.
- `nitrogen-from-fixation` and `design-success-rate` had names of our own where the fields say
  "nitrogen derived from the atmosphere (%Ndfa)" and "experimental hit rate".
- The layer `physics` was defined as a physical, chemical or biological principle, so a biological
  gap sat in a layer called physics.
- A gap was `closed` after "at least one demonstration", while a single unreplicated result is only
  `reported` evidence (decision 0006).

## Decision

1. **A metric takes the name its field uses**, and its meaning names the conditions without which
   two values cannot be compared. The renamed and split metrics are:

   | Was | Is |
   |---|---|
   | `cost-per-tonne-co2` | `net-removal-cost` (levelized cost of net CO2 removal) and `capture-cost` (levelized cost of CO2 capture) |
   | `fusion-target-gain` | `scientific-gain` (Q_sci; in inertial confinement, the target gain) |
   | `two-qubit-gate-error` | `two-qubit-gate-infidelity` (average gate infidelity) |
   | `nitrogen-from-fixation` | `nitrogen-derived-from-atmosphere` (%Ndfa) |
   | `design-success-rate` | `experimental-hit-rate` |

2. **The layer `physics` is `principle`**, with the same meaning.
3. **A gap is closed only by an established evidence card.** `tools/check.py` rejects a closed gap
   whose `evidence` lists none. A target reached in a single reported result leaves the gap
   `promising`.

## Consequences

- Metric ids are not part of any address of the site or the export schema, so no link breaks. A
  consumer of `atlas.json` that filtered on an old id has to use the new one.
- The two CO2 cards move to the two new metrics. No technology used `cost-per-tonne-co2`.
- Fusion power has no metric for the engineering gain, the electricity a plant sends out over what
  it draws, which is the number that decides whether a plant is a power source. It needs a sourced
  current value before it is added.
- No gap was closed, so rule 3 changes no data.
