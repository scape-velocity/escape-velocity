---
name: weekly-brief
description: Write a brief of the new literature for the tracked and mapped technologies of the Escape Velocity atlas since a given date, with what moved a current value, what opened or closed a gap and what to review. Use when asked for a weekly or monthly update, what changed in a domain, or to prepare a curator's review.
---

# Weekly brief

A brief tells a curator what to look at, in ten minutes. It does not change the atlas: it proposes
changes, each with evidence.

## 1. Choose the scope

By default: every technology with status `tracked` or `mapped`, since the date of the last brief (or
the last seven days). A domain or a single technology when asked. List the technologies and their
`last_reviewed` dates.

## 2. Scout each technology

```bash
python3 skills/scout-literature/scripts/search.py search --tech <domain>/<slug> --since <year> --limit 5
```

Keep only results published after the start date. Read the abstract of each one that could matter
(`search.py abstract <id>`), following `scout-literature`.

## 3. Sort what you found

For each technology, in this order:

1. **New current value**: a result that beats the headline metric or another metric. Draft the
   evidence card and run `review-evidence`.
2. **Gap moved**: evidence that an approach works (gap to `promising`) or that the metric reached
   the target (gap to `closed`).
3. **New limit or new obstacle**: a result that shows a target is harder than thought.
4. **Worth reading**: relevant, no change to the atlas.

Nothing found is reported as nothing found.

## 4. Write

A Markdown brief, in `reports/brief-<YYYY-MM-DD>.md` if asked to keep it: one section per
technology with findings, each line with the identifier, one sentence on what it shows and the
proposed change. End with the list of cards drafted and their check status. Mark extrapolations
and speculation as such. Do not edit technology files from a brief without a curator's go-ahead.
