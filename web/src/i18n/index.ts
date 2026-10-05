/* The interface strings of each language. English (en.json) is the source; every other file has
   the same keys, which the `satisfies` below enforces at typecheck time. A language has pages when
   it has a file here, an entry in DICTIONARIES and an atlas.<id>.json next to atlas.json
   (docs/export.md). The data texts come translated in that file; these are only the interface's. */

import en from "./en.json";
import pt from "./pt.json";

export type Dictionary = typeof en;

const DICTIONARIES = { en, pt } satisfies Record<string, Dictionary>;

/** The id of a language the interface is written in: "en", "pt". */
export type Lang = keyof typeof DICTIONARIES;

export { DEFAULT_LANG, fill, plural } from "./core";

export function isLang(id: string): id is Lang {
  return Object.hasOwn(DICTIONARIES, id);
}

export function dictionary(lang: Lang): Dictionary {
  return DICTIONARIES[lang];
}
