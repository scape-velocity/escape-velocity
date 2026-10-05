# Translating the atlas

The atlas is written in English and translated into other languages by people who read both
([decision 0014](decisions/0014-translations.md)). A translation never changes the English: it is a
layer on top, and where it is missing or out of date readers see the English.

| Language | Folder | Maintainers | Site |
|---|---|---|---|
| Portuguese (Brazil) | [`i18n/pt/`](../i18n/pt/) | @JoaoAlisson | [/pt/](https://scape-velocity.github.io/escape-velocity/pt/) |

The list is [`i18n/languages.toml`](../i18n/languages.toml).

## What there is to translate

| What | Where |
|---|---|
| The interface: menus, headings, buttons, notices | `web/src/i18n/<lang>.json`, the same keys as `en.json` |
| The words around numbers ("orders of magnitude", "met") and the decimal mark | `i18n/<lang>/strings.toml` |
| The taxonomy: domains, metrics, readiness scales, vocabulary, SDGs | `i18n/<lang>/taxonomy/<file>.toml` |
| A technology | `i18n/<lang>/atlas/<domain>/<slug>.toml` |
| An evidence card: its note and the conditions of each finding | `i18n/<lang>/evidence/<key>.toml` |

Never translated: identifiers, numbers, units, search terms, the titles and authors of sources, and
quotes, which are evidence and stay as the source wrote them.

## An overlay

Each file under `i18n/<lang>/` mirrors a source file and lists the texts that replace its English:

```toml
status = "machine"         # or "reviewed"
reviewed_by = []           # GitHub handles of whoever reviewed the whole file

[[text]]
path = "gap[cost].title"   # where the text is in the source file
source = "3f2a9c01be"      # fingerprint of the English it was translated from
text = "O custo projetado continua em centenas de USD por tonelada"
```

`path` names the field: `name`, `statement`, `requires[<technology>].why`,
`metric[<id>].current.note`, `gap[<id>].description`, `gap[<id>].approach[<n>].name`,
`finding[<n>].conditions`, `domain[<id>].summary`, `layer[<id>].label`. Positions count from 1.
You do not have to write paths or fingerprints: the tool does.

## Step by step

```bash
python3 tools/translate.py status --lang pt                        # what is missing or stale
python3 tools/translate.py template pt atlas/climate/direct-air-capture.toml
python3 tools/translate.py show pt atlas/climate/direct-air-capture.toml
```

`template` adds every text the overlay lacks with an empty `text`; fill in the ones you translate
and leave the rest empty. `show` prints each English text next to its translation. Then:

```bash
python3 tools/check.py
```

It fails if a number in your translation differs from the English, or if a path does not exist.
Keep numbers, dates and units as the English writes them, with the decimal mark of your language.
Use the terms in `i18n/<lang>/glossary.toml`; if a term is missing or wrong, change it in the same
pull request and say why.

## When the English changes

The fingerprint of the English no longer matches and the translation is **stale**: the site shows
the English again, and `tools/check.py` warns. To update it, read the new English, fix the
translation and record the English it now follows:

```bash
python3 tools/translate.py status --lang pt --list stale
python3 tools/translate.py stamp pt atlas/climate/direct-air-capture.toml --path "gap[cost].description"
```

Stamp only what you have read. Stamping without updating the text hides a stale translation.

## Machine and reviewed

A file translated by a model is `status = "machine"`, and its pages say that the text has not been
reviewed. Whoever reviews the whole file sets `status = "reviewed"` and adds their handle to
`reviewed_by`. A single text added later by a model can carry its own `status = "machine"`.

An agent translating follows the [`translate-page`](../skills/translate-page/SKILL.md) skill and
leaves its work as `machine`; a person reviews it.

## Pull requests

- Title: `translation(<lang>): <what>`, in English, such as
  `translation(pt): translate the climate domain`.
- The description is in English; comments on the wording can be in the language.
- One of the language's maintainers approves it. Curators and moderators do not need to: the
  English was approved already.
- The [translation form](../.github/ISSUE_TEMPLATE/translation.yml) reports a wrong translation or
  offers help with a language.

## A new language

Open an issue with the translation form. A maintainer adds the language to `i18n/languages.toml`
with `published = false` and you as its maintainer; you translate the interface
(`web/src/i18n/<lang>.json`), `strings.toml`, a glossary and the taxonomy; then the language is
published and the site builds its pages.
