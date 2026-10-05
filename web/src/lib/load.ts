/* Reads atlas.json, and atlas.<lang>.json for a translated edition, at build time. Server only:
   imported by pages and layouts, never by a client component. The files are written by
   `python3 tools/build_site.py` (docs/export.md); the `languages` list of atlas.json names the file
   of each language. */

import { readFileSync } from "node:fs";
import path from "node:path";

import { DEFAULT_LANG, isLang, type Lang } from "@/i18n";

import { Atlas } from "./model";
import type { AtlasData, Language } from "./types";

const cached = new Map<Lang, Atlas>();

/** The path of atlas.json: ATLAS_JSON, or ../_site/atlas.json relative to web/. */
export function atlasPath(): string {
  return path.resolve(process.cwd(), process.env.ATLAS_JSON ?? "../_site/atlas.json");
}

function read(file: string, missing: string): AtlasData {
  let text: string;
  try {
    text = readFileSync(file, "utf-8");
  } catch {
    throw new Error(missing);
  }
  const data = JSON.parse(text) as AtlasData;
  if (data.schema !== 1) {
    throw new Error(`${path.basename(file)} has schema ${data.schema}; this interface reads schema 1 (docs/export.md).`);
  }
  return data;
}

export function loadAtlas(lang: Lang = DEFAULT_LANG): Atlas {
  const hit = cached.get(lang);
  if (hit) return hit;
  const file = atlasPath();
  let data: AtlasData;
  if (lang === DEFAULT_LANG) {
    data = read(
      file,
      `atlas.json not found at ${file}. Run \`python3 tools/build_site.py\` from the repository root first, ` +
        "or point ATLAS_JSON at the file.",
    );
  } else {
    const entry = loadAtlas(DEFAULT_LANG).data.languages.find((l) => l.id === lang);
    if (!entry) throw new Error(`atlas.json does not list the language "${lang}" (i18n/languages.toml, published = true).`);
    const translated = path.join(path.dirname(file), entry.file);
    data = read(
      translated,
      `${entry.file} not found at ${translated}, though atlas.json lists ${entry.english_name}. ` +
        "Run `python3 tools/build_site.py` from the repository root again.",
    );
    if (data.lang !== lang) throw new Error(`${entry.file} holds the language "${data.lang}", not "${lang}".`);
  }
  const atlas = new Atlas(data);
  cached.set(lang, atlas);
  return atlas;
}

/** One technology in priorities.json (docs/export.md). */
export interface PriorityRow {
  id: string;
  votes: number;
  excluded_new_accounts: number;
  discussion: string;
}

/** The vote count written by `python3 tools/priorities.py count` (decision 0016). */
export interface Priorities {
  schema: number;
  counted_at: string;
  rule: string;
  min_account_age_days: number;
  category_url: string;
  technologies: PriorityRow[];
}

let priorities: Priorities | null | undefined;

/** The vote count at PRIORITIES_JSON, or null when the variable is unset or the file is missing:
    the count has not run (no token, no "Priorities" category yet), and the explorer shows no
    ranking. Votes rank what to map next; nothing else in the atlas reads them. */
export function loadPriorities(): Priorities | null {
  if (priorities !== undefined) return priorities;
  const env = process.env.PRIORITIES_JSON;
  priorities = null;
  if (!env) return priorities;
  const file = path.resolve(process.cwd(), env);
  let text: string;
  try {
    text = readFileSync(file, "utf-8");
  } catch {
    return priorities;
  }
  const data = JSON.parse(text) as Priorities;
  if (data.schema !== 1) {
    throw new Error(`${path.basename(file)} has schema ${data.schema}; this interface reads schema 1 (docs/export.md).`);
  }
  priorities = data;
  return priorities;
}

/** The languages with pages: listed in atlas.json and with interface strings in src/i18n. */
export function siteLanguages(): (Language & { id: Lang })[] {
  return loadAtlas(DEFAULT_LANG).data.languages.filter((l): l is Language & { id: Lang } => isLang(l.id));
}

/** The languages served under /<id>/: every site language but English. */
export function translatedLanguages(): (Language & { id: Lang })[] {
  return siteLanguages().filter((l) => l.id !== DEFAULT_LANG);
}

/** A language's entry in atlas.json `languages`. */
export function languageOf(lang: Lang): Language {
  const entry = siteLanguages().find((l) => l.id === lang);
  if (!entry) throw new Error(`atlas.json does not list the language "${lang}".`);
  return entry;
}
