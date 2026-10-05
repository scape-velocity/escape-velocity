---
name: cross-domain-transfer
description: Look for approaches from one domain of the Escape Velocity atlas that could close a gap in another (a decoder from telecom for quantum error correction, a cryocooler from space for medicine), and record them as speculation with the evidence for the source side. Use when a gap has no promising approach, when asked for unconventional ideas, or when two technologies in different domains share a metric or a physical problem.
---

# Cross-domain transfer

Many breakthroughs are borrowings: a method mature in one field applied to a problem in another.
The atlas makes them visible because metrics and gap types are shared across domains. This skill
proposes; every proposal is speculation until someone tests it.

## 1. Pick the gap

Start from an open gap with no `promising` approach. Write down, in general terms: the metric it
holds back, the physical or informational problem underneath (heat removal at low temperature,
inference at microsecond latency, delivery of a molecule to one tissue), and the gap type.

## 2. Find who solved the general problem

- Search the atlas for the same metric or the same kind of problem in other domains:
  `grep -l '<metric id>' atlas/*/*.toml`, and read their gaps and approaches.
- Search the literature in other fields with the general problem, not the field's jargon:
  `search.py search "sub-microsecond inference FPGA" --since 2022` rather than "surface code
  decoding".
- Look for a solution that is mature (high readiness) where it comes from.

## 3. Test the idea on paper

For each candidate say: what is transferred (a method, a material, a device, a dataset); what
differs between the two settings (temperature, scale, regulation, cost); what would have to be true
for it to work; the cheapest experiment that would show whether it does. Discard candidates you
cannot fill in.

## 4. Record

Proposals do not go into the technology file as approaches until there is evidence they work in the
target setting. Record them in the pull request or issue, labelled **Speculation**, with:

- the gap (`<domain>/<slug>` and gap id);
- the source technology or paper, with an evidence card for what is established on the source side;
- the conditions and the proposed experiment.

When a test is published, the approach enters the gap with that paper as evidence, and the class of
its card follows the usual rules.
