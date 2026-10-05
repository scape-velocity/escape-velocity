---
name: decompose-technology
description: Map what an Escape Velocity technology depends on and what stands in its way, writing each dependency as its own technology with its own metrics and gaps, and the gaps of the technology itself. Use to take a technology from proposed or scoping to mapped, when asked "what does X need", or when a gap turns out to be another technology's problem.
---

# Decompose a technology

The atlas is a graph. Each technology names the technologies it needs (`[[requires]]`), and each
of those is tracked in its own right: its own file, its own headline metric, its own gaps. A gap
that belongs to a dependency is written there, and the dependent technology points to it with
`blocked_by`.

## 1. Ask what must be true

For the technology's target, list what must exist for it to be reached. For each item decide:

- **A dependency** when it is a capability others need too, with its own measurable target:
  cryogenic refrigeration, a real-time decoder, a low-cost superconducting tape. Write it as a
  technology.
- **A gap** when it belongs to this technology alone: the physical error rate of these qubits, the
  sensitivity of this test at stage I.

Rule of thumb: if a second technology in another domain would list it too, it is a dependency.

## 2. Write each dependency

- If the file exists, add the `[[requires]]` entry: `technology`, `why`, and, when you can say it,
  the number this technology needs from it (`metric`, `value`, or `need` in words).
- If it does not exist, create it with `define-technology`, as `proposed` at least. A dependency
  can stay proposed; the generated page shows what each dependent needs from it, which is the
  start of its own map.
- Keep the graph acyclic: if A needs B and B needs A, one of them is the wrong level. `check.py`
  rejects cycles.
- Two or three levels are enough. Stop where the dependency is a commodity (electricity, silicon
  wafers) unless it is a real bottleneck.

## 3. Write the gaps

For each gap: `title`, two to five sentences of `description` with the numbers, the local `metric`
it holds back, `type`, `layer`, `severity` and `status` (vocabulary in `taxonomy/vocabulary.toml`),
the evidence that shows it, and `search_terms` for the scout.

- `severity = "critical"` only when the target cannot be reached until the gap closes.
- `blocked_by` lists dependencies (already in `[[requires]]`) whose own gaps keep this gap open.
- A target beyond a physical limit is a gap with `status = "beyond-limit"`: the target must change.
- Approaches (`[[gap.approach]]`) are the lines of research aimed at the gap, each with evidence.

## 4. Finish

```bash
python3 tools/generate.py && python3 tools/check.py
```

Open the generated page and read the dependency graph. If it does not tell a newcomer what stands
between today and the target, the decomposition is not done.
