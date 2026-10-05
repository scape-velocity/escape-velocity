# 0016. Community priorities

- Date: 2026-10-05
- Status: accepted

## Context

The atlas maps a few technologies at a time, and curators choose which. Readers who do not
contribute data have no way to say what they would like mapped next, and the curators have no
signal of it beyond issues. A vote answers that question cheaply, but it brings three risks:

- **A vote is not evidence.** If votes could move a status, a readiness level or a number, the
  atlas would measure popularity instead of the state of a technology.
- **Votes can be inflated.** Throwaway accounts can be created to push one technology up.
- **Votes are personal data.** Publishing who voted for what is not needed to rank anything.

## Decision

1. **A vote is a thumbs up** (the `THUMBS_UP` reaction) on the opening post of a technology's
   Discussion in the "Priorities" category of the repository. The Discussion's title is the
   technology's id, `<domain>/<slug>`. `tools/priorities.py sync` opens the Discussion each
   technology that is not `retired` lacks; `.github/workflows/priorities.yml` runs it when the
   atlas changes.
2. **One vote per account**, which is GitHub's own rule: an account reacts once with each emoji.
3. **New accounts do not count.** A reaction from an account created less than 30 days before the
   reaction is left out, and the count reports how many were left out.
4. **No login is published**, only counts.
5. **The count is built, never committed.** `tools/priorities.py count` writes
   `_site/priorities.json` when the site is built (`.github/workflows/pages.yml`, daily and on every
   push), and the explorer ranks the technologies from it at `/priorities/`. Nothing about votes is
   written to the repository, as no tool writes to the default branch
   ([decision 0007](0007-agents-skills-and-mcp.md) §4).
6. **Technologies first.** This version covers technologies only; gaps get votes later, if this
   version is used.
7. **The rule, word for word, wherever votes are shown:** "Votes rank what the community wants
   mapped next. They never change a status, a readiness level, a claim class or a number." A
   translated edition of the explorer shows it in its language, like the rest of its interface
   ([decision 0014](0014-translations.md)).

## Consequences

- The category is created by a maintainer in Settings > Discussions; the API cannot create it.
  Until it exists, both commands warn and exit with 0, and the explorer says the votes have not
  been counted yet.
- A failed count does not stop the site: `pages.yml` publishes the atlas without a ranking, and
  the failure shows in the workflow run.
- The count ignores a Discussion whose title is not a technology id, or is the id of a `retired`
  technology. Renaming a Discussion takes it out of the ranking; `sync` then opens a new one with
  the right title.
- Curators may read the ranking when choosing what to map, and are not bound by it.
