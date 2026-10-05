---
name: find-neglected-gaps
description: Find the gaps in the Escape Velocity atlas that block the most technologies and receive the least research, using the dependency graph and publication counts from OpenAlex. Use when asked where effort would matter most, what nobody is working on, which bottlenecks are shared across domains, or to prepare a priorities report.
---

# Find neglected gaps

A gap matters more when many technologies wait on it, and is neglected when few people publish on
it. The graph gives the first; the literature gives the second. Neither alone is a priority: this
skill produces candidates for a person to judge.

## 1. Rank by what depends on it

`STATUS.md` lists the most depended-on technologies and the critical gaps. For each candidate
technology, count:

- direct and indirect dependents (follow "Required by" on its page, transitively);
- dependents whose gaps list it in `blocked_by`: those are blocked, not just related;
- domains among the dependents: a bottleneck shared by quantum, fusion and medicine is worth more
  than one inside a single field.

## 2. Measure the research effort

For each open gap of the top candidates, run two or three phrasings of its `search_terms`:

```bash
python3 skills/scout-literature/scripts/search.py count "<gap search term>" --from 2015
```

The script prints works per year whose title or abstract match, and the ratio of the mean of the
second half of the period over the first. Record the total of the last three full years and the
ratio.

Counts are relative, not absolute: compare gaps of similar kind, and check that the query finds the
right papers (`search` with the same words) before trusting a count. A low count from a bad query
is not neglect.

## 3. Classify

| | Many dependents | Few dependents |
|---|---|---|
| **Little research, flat or falling** | Neglected bottleneck: report first | Niche: note |
| **Much research, growing** | Crowded bottleneck: watch | Fashionable: ignore |

Gaps of type `cost`, `regulation`, `manufacturing` or `supply-chain` are often neglected by the
literature and worked on in industry; say so rather than count them as neglected.

## 4. Report

For each neglected bottleneck: the technology and gap, the dependents and their domains, the
counts with the queries used, the ratio, and one sentence on why it may be neglected (unfashionable,
between disciplines, no funding agency owns it, needs expensive facilities). Mark that last
sentence as speculation. Write the report in `reports/neglected-gaps-<YYYY-MM-DD>.md` if asked to
keep it; it is not part of the atlas.
