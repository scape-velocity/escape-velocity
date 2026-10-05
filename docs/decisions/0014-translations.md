# 0014. Translations

- Date: 2026-10-05
- Status: accepted; narrows rule 8 of AGENTS.md ("English only") to the work, not its readers

## Context

The atlas is written for anyone deciding where research effort goes, and many of them read another
language better than English. Translating it raises four problems:

- **The work has to stay in one language.** Evidence, review and moderation happen in English;
  splitting them across languages would split the community that checks the numbers.
- **Translations go stale.** A value or a gap changes in English and the translation keeps
  describing the old one. English contributors cannot be asked to update languages they do not
  read.
- **Translators are not domain experts, and domain experts are not translators.** A curator of
  fusion power can judge the English text of a gap, not its Portuguese.
- **Machine translation is cheap and unreviewed.** Waiting for people to translate everything would
  publish almost nothing; publishing machine output as if reviewed would mislead.

## Decision

1. **English is the source of every text.** The data, code, commits, issues, decisions and the
   titles and descriptions of pull requests stay in English. A translation is a layer derived from
   the English, and nothing in the English depends on it.
2. **Languages are registered** in `i18n/languages.toml`, each with its own maintainers. They
   approve the translations into their language through the `moderation` check, instead of the
   domain's moderators: the English was approved already, and what is left to judge is the
   language.
3. **A translation is an overlay.** For each source file, `i18n/<lang>/<same path>` lists the texts
   that replace the English, each with the fingerprint of the English it was translated from. Only
   prose is translated: names, statements, scopes, notes, conditions and meanings. Identifiers,
   numbers, units, search terms, the titles and authors of sources and the quotes from them are
   never translated.
4. **A stale translation falls back to English.** When the English changes, its fingerprint no
   longer matches. `tools/check.py` warns and never fails, so an English contributor is never
   blocked, and the site shows the English text until a translator updates the translation.
5. **Machine translation may be published, marked as such.** An overlay is `machine` until a person
   reviews it and becomes `reviewed`, with the reviewers' handles. Pages that show machine
   translation say so.
6. **The checks that can be automated are errors**: a translation of a text its source file does
   not have, and a translation whose numbers differ from the English.
7. **The site keeps English at its addresses** and puts each published language under `/<id>/`.
   A page in another language shows English for what is not translated yet, with a notice. The
   words of the interface live in `web/src/i18n/<id>.json`.
8. **The export grows without breaking readers.** `atlas.json` gains `lang`, `tag`, `languages`
   and a `label` for each vocabulary value, and each published language has an `atlas.<id>.json`
   of the same shape with the translated texts and how much is translated. The schema stays 1.
9. **What stays in English only**: `llms.txt`, `llms-full.txt`, the MCP server, the generated
   Markdown pages, the decisions and the documentation.
10. **A translation pull request** has the type `translation` and the language as its scope. Its
    title and description are in English; discussion of the wording may be in the language.
11. **No translation platform for now.** Pull requests, `tools/translate.py` and the
    `translate-page` skill are enough while each language has a few translators. A platform such as
    Weblate is reconsidered when that stops being true.

## Consequences

- Adding a language is a registry entry, an interface dictionary and overlays; no component of the
  explorer names a language.
- Portuguese (Brazil) is the first language, maintained by @JoaoAlisson. Its taxonomy is translated
  by machine from the start; the technologies and evidence cards follow.
- The explorer shows vocabulary values by their label, so English readers also see "beyond limit"
  instead of `beyond-limit`.
- Every change to English prose can make a translation stale. That is the translators' work, and
  `python3 tools/translate.py status` shows how much of it is waiting.
