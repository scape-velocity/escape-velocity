---
name: write-impact
description: Write the impact of a technology in the Escape Velocity atlas, as [[impact]] entries (benefit or risk, who, claim, class, evidence) that tools/check.py accepts. Use when someone asks what a technology would change, for whom, or what risk it brings, and when a technology moves to mapped, tracked or achieved and needs at least one impact.
---

# Write impact

An impact says who gains or loses when the technology reaches its target, and on which evidence.
No card, no impact.

## The schema

```toml
[[impact]]
kind = "risk"                      # benefit or risk
who = "Anyone whose data is protected by RSA-2048"
claim = "A machine with less than a million noisy qubits could factor a 2048-bit RSA integer in under a week."
class = "reported"                 # established, reported or extrapolation
evidence = ["gidney2025how"]       # required, at least one key of evidence/
metric = "physical-qubits"         # optional: a metric of this technology whose target unlocks the impact
horizon = "2030s"                  # optional, free text like the technology's horizon
sdgs = [9]                         # optional, ids of taxonomy/sdgs.toml
# assumptions = "..."              # required when class = "extrapolation"
```

## The rules tools/check.py applies

1. Known keys only; `kind` in {benefit, risk}; `who` and `claim` non-empty text; `evidence` a list
   with at least one key, all in `evidence/`; `metric`, if present, is the `metric` of a `[[metric]]`
   of the same technology; `sdgs`, if present, exist in `taxonomy/sdgs.toml`.
2. `class` in {established, reported, extrapolation}. `speculation` is refused: speculation belongs
   in the pull request or the issue.
3. The class cannot be stronger than the evidence: `established` needs at least one cited card of
   class `established`; `reported` needs an `established` or `reported` card; `extrapolation` holds
   with any card, but needs a non-empty `assumptions`.
4. Status: `mapped`, `tracked` and `achieved` need at least one `[[impact]]`. `proposed` and
   `scoping` may have them.

## Steps

1. Find the card. The claim says only what the card's `quote` or `note` says, or what the abstract
   says (`python3 skills/scout-literature/scripts/search.py abstract <doi:...|arxiv:...>`). No card:
   stop, and add one first (`add-evidence-from-doi`, or `scout-literature` to look for one). Never
   write an impact without a card.
2. Set `class` by rule 3, from the classes of the cited cards. If the claim goes beyond what any
   card says, it is `extrapolation` and `assumptions` names what has to hold.
3. If the idea is speculation (no card supports even an extrapolation), do not write it in the TOML:
   put it in the pull request description or open an issue.
4. Fill `metric` only when reaching that metric's target is what unlocks the impact.
5. Check:

   ```bash
   python3 tools/generate.py
   python3 tools/check.py
   ```

6. Translate `who`, `claim` and `assumptions` into Portuguese with `translate-page`.
