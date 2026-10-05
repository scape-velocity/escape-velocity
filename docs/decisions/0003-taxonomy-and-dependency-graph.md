# 0003. Taxonomy: domains, facets and a dependency graph

- Date: 2026-10-04
- Status: accepted

## Context

The atlas needs a way to categorize technologies across very different fields, and a way to say
that one technology waits on another. A first design made capabilities internal parts of a goal.
The maintainer pointed out that a technology pending on another can have its own tracking with its
own gaps: refrigeration matters to quantum computing, to medical imaging and to space telescopes,
and its gaps should be written once.

## Decision

1. **Every technology is a node** with its own file, status, metrics and gaps, at any depth.
   `[[requires]]` names the technologies it depends on, why, and what it needs from each (a metric
   and value, or a need in words). The pages of a dependency show what each dependent needs from
   it. Cycles are rejected.
2. **A gap belongs to the technology that has it.** When a dependency holds a gap open, the gap
   says `blocked_by` that dependency, which must also be in `[[requires]]`.
3. **Hierarchy: thirteen domains** (`taxonomy/domains.toml`). The domain is where the file lives and
   which community reviews it; the graph crosses domains freely. `enablers` holds the shared
   infrastructure: cryogenics, heat removal, power electronics, photonics, lasers, sensors. A new
   domain needs a decision.
4. **Facets on gaps**: type (scientific-unknown, engineering, fundamental-limit, data,
   manufacturing, cost, regulation, supply-chain), layer (physics, device, system, manufacturing,
   deployment), severity (critical, high, medium, low) and status (open, active, promising, closed,
   beyond-limit).
5. **Facets on technologies**: status of the mapping (proposed, scoping, mapped, tracked, achieved,
   retired), readiness on a scale (decision 0005), UN Sustainable Development Goals served.
6. **Literature mapping**: each domain lists OpenAlex fields, arXiv categories and whether PubMed
   applies; each technology and gap lists search terms. This is what the scout searches.
7. **Controlled vocabulary** in `taxonomy/vocabulary.toml` and one metric list in
   `taxonomy/metrics.toml`, shared by every domain.

## Consequences

- The most depended-on technologies and the bottlenecks shared across domains become visible on
  `STATUS.md`, which is the point of the graph.
- Deciding whether something is a dependency or a gap is a judgment. The rule of thumb is in the
  `decompose-technology` skill: if a technology in another domain would list it too, it is a
  dependency.
- Dependencies can stay `proposed` for a long time; their pages still show what is needed from them.
