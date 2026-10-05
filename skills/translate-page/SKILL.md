---
name: translate-page
description: Translate a technology, an evidence card or a taxonomy file of the Escape Velocity atlas from English into a language registered in i18n/languages.toml, as an overlay under i18n/<lang>/. Use when asked to translate part of the atlas, to update stale translations, or to work on an issue opened with the translation form.
---

# Translate a page

English is the source; a translation is an overlay that replaces English texts and falls back to
English where it is missing or stale ([decision 0014](../../docs/decisions/0014-translations.md),
[docs/translating.md](../../docs/translating.md)). You write the overlay; a person who reads the
language reviews it.

## 1. Check the language and what is missing

```bash
python3 tools/translate.py status --lang <lang> --list missing
python3 tools/translate.py status --lang <lang> --list stale
```

The language must be in `i18n/languages.toml`. If it is not, stop: adding a language is a
maintainer's decision, asked for with the translation form.

## 2. Read the glossary and the conventions

Open `i18n/<lang>/glossary.toml`. Use its term for every English term it lists, in every text,
even where another word would read better in that sentence; one term, one word. If a term the
page needs is missing, add it to the glossary in the same pull request.

## 3. Prepare the overlay

```bash
python3 tools/translate.py template <lang> <source file>
python3 tools/translate.py show <lang> <source file>
```

`template` adds each text the overlay lacks, with its path and fingerprint, and an empty `text`.
Fill in `text`; do not touch `path` or `source`.

## 4. Translate

- **Meaning first.** Translate what the English claims, at the same strength: "about", "at least",
  "no source found", "reported" keep their hedge. A translation that sounds surer than the English
  is wrong.
- **Numbers stay as written**: every digit of the English appears in the translation, with the
  language's decimal mark (`1.5` becomes `1,5` in Portuguese). Dates stay ISO (`2022-12-05`).
  Units, symbols and formulas stay (`USD/t`, `Q_sci`, `CO2`, `1 - F_avg`).
- **Never translate**: identifiers, names of facilities, institutions, companies and products, the
  titles and authors of sources, and anything in quotes from a source.
- **Abbreviations** stay as the field writes them in the language (TRL stays TRL in Portuguese).
- **Style**: plain, precise, neutral, as the English. No added explanations; if the English is
  unclear, say so in the pull request instead of guessing.
- A text you cannot translate with confidence stays empty: readers see the English.

## 5. Mark it as machine translation

Leave `status = "machine"` and `reviewed_by = []`. Only a person who read the whole file sets
`reviewed`.

## 6. Check

```bash
python3 tools/check.py
python3 tools/build_site.py
```

`check.py` fails on a path the source does not have and on a translation whose numbers differ
from the English; fix the translation, not the check. Then look at the page in the explorer
(`web/README.md`) in the language.

## 7. Updating stale translations

For each stale text: read the new English with `show`, fix the translation, then

```bash
python3 tools/translate.py stamp <lang> <source file> --path "<path>"
```

Never stamp a text you did not update.

## 8. The pull request

Title `translation(<lang>): <what>`, in English, such as
`translation(pt): translate climate/direct-air-capture`. Say which model translated it. One of the
language's maintainers approves it (GOVERNANCE.md).
