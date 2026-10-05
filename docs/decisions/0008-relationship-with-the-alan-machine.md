# 0008. Relationship with The Alan Machine

- Date: 2026-10-04
- Status: accepted

## Context

[The Alan Machine](https://the-alan-machine.github.io/alan-machine/) is an open-source book about a
hypothetical supercomputer at the physical limits of computation. Its Building Alan dossiers track
real technology (CMOS, data movement, heat removal, reversible and superconducting logic, quantum
hardware, energy per token) against those limits. Escape Velocity tracks the same kind of thing
across many fields. The two should feed each other without one depending on the other's internals.

## Decision

1. **Separate projects, separate organizations**, linked by stable URLs and shared vocabulary.
2. **Links from the atlas**: a technology lists the book pages that discuss it
   (`alan_machine = [{ page = "...", title = "..." }]`); the generated page links to them.
3. **Shared metrics**: `taxonomy/metrics.toml` maps metrics to the book's names (`alan_machine`
   field), so the same quantity has one meaning in both.
4. **The book's limits**: the `alan` library planned by the book computes the Landauer,
   Margolus-Levitin and Bekenstein bounds; the atlas will use it to fill computing limits (stage 1).
5. **From the atlas to the book**: dossiers will cite a pinned version of the atlas export for
   current values and gaps. That needs a decision in the book (amending its decision 0008), to be
   proposed there.
6. **Classes align**: the atlas's evidence classes are the book's kinds of claim.

## Consequences

- Quantum computing and AI are the first technologies mapped in full, because both projects need
  them.
- A change of a metric's meaning in either project needs a matching change in the other; the
  `alan_machine` field is how a reviewer finds the pair.
