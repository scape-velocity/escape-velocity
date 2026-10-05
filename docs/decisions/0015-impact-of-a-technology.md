# 0015. The impact of a technology

- Date: 2026-10-05
- Status: accepted

## Context

The atlas says how far each technology is from its target, and what holds it back. It does not say
why reaching the target matters: who gains, and who is put at risk. Readers deciding where research
effort goes ask that first, and without it they fill the blank from press releases.

Impact is where an open atlas is easiest to bend:

- **Claims about consequences outrun their evidence.** A resource estimate becomes "breaks all
  encryption"; a modelled efficiency gain becomes "solves AI's energy problem". The atlas already
  grades every card by class (decision 0006); an impact has to keep the grade of the cards it rests
  on.
- **Speculation is cheap to write and expensive to check.** An agent can produce plausible
  consequences for every technology in minutes. The cross-domain-transfer skill already keeps
  speculation out of the data, in the pull request or the issue.
- **Risks matter as much as benefits.** An atlas that lists only benefits reads as advocacy.
- **Readers outside the repository need the shape.** `atlas.json` is read by programs (the
  explorer, language models through `llms.txt`, the MCP server) that cannot see the TOML or the
  checks, and a field added without documentation breaks them silently.

## Decision

1. **A technology lists its impact as `[[impact]]` tables:**

   ```toml
   [[impact]]
   kind = "risk"                      # benefit or risk
   who = "Anyone whose data is protected by RSA-2048"
   claim = "A machine with less than a million noisy qubits could factor a 2048-bit RSA integer in under a week."
   class = "reported"                 # established, reported or extrapolation
   evidence = ["gidney2025how"]       # required, at least one key of evidence/
   metric = "physical-qubits"         # optional: a metric of this technology whose target unlocks the impact
   # horizon = "..."                  # optional, free text like the technology's horizon, with a source
   sdgs = [9]                         # optional, ids of taxonomy/sdgs.toml
   # assumptions = "..."              # required when class = "extrapolation"
   ```

2. **`tools/check.py` enforces four rules:**
   1. Only these fields. `kind` is `benefit` or `risk`; `who` and `claim` are non-empty text;
      `evidence` lists at least one card, each in `evidence/`; `metric`, when present, is the
      `metric` of one of the technology's own `[[metric]]` tables; `sdgs`, when present, are in
      `taxonomy/sdgs.toml`.
   2. `class` is `established`, `reported` or `extrapolation`. `speculation` is refused: it stays
      in the pull request or the issue, labelled Speculation, as in the cross-domain-transfer skill.
   3. **The class is never stronger than the evidence.** `established` needs at least one cited
      card of class `established`; `reported` needs an `established` or `reported` card;
      `extrapolation` may rest on any card but needs non-empty `assumptions`.
   4. A `mapped`, `tracked` or `achieved` technology has at least one impact. `proposed` and
      `scoping` may have some.
3. **Impact is prose to translate.** `who`, `claim` and `assumptions` are translatable texts
   (decision 0014), at paths `impact[<n>].who` and so on, counted from 1 in file order.
4. **The export has a JSON Schema.** `tools/atlas.schema.json` (JSON Schema 2020-12) describes
   `atlas.json`; `tools/build_site.py` publishes it as `atlas.schema.json` and `llms.txt` links it.
   The technology and impact objects are closed (`additionalProperties: false`). `tools/check.py`
   builds the export in memory with the function `build_site.py` uses and validates it with a
   standard-library validator (`type`, `required`, `properties`, `additionalProperties`, `items`,
   `enum`, `$ref` to `$defs`), so the check still needs nothing beyond Python. A field added to
   the export without documenting it in the schema and in `docs/export.md` fails the check. The
   change is additive, so `schema` stays 1.
5. **The MCP server names the SDGs.** The `technology` tool returns `sdg_names`, a list of
   `{id, name}`, next to `sdgs`, which keeps its ids; its description names impact, SDGs and
   horizon, so a client knows to ask for them.
6. **Three skills lower the cost of a first contribution:** `first-contribution` picks a small task
   (a proposed technology one step from scoping, a card not yet machine-checked, a text missing in
   a language) and walks through the pull request; `write-impact` writes `[[impact]]` under the
   rules above; `add-evidence-from-doi` turns a DOI the contributor already has into a checked
   evidence card.

## Consequences

- Every technology page, generated and in the explorer, has an Impact section above the metrics,
  with the class and the cards of each claim.
- The two mapped technologies get one impact each, written only from what their cards and
  abstracts say: the risk to RSA-2048 for the fault-tolerant quantum computer, and the energy
  saving for energy-efficient AI inference.
- A technology reaching `mapped` now also needs someone to write what it would change, with a card.
  That is the point: the atlas maps technologies whose consequences can be sourced.
- Readers of `atlas.json` can validate it and learn its shape from `atlas.schema.json` instead of
  from examples.
- Evidence cards cited only by an impact count as cited, and appear in the technology's evidence
  list.
