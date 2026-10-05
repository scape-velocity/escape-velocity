/* Paths of the pages, relative to the base path (next/link and the router add it). English is at
   the root and every other language under /<id>/ with the same subpaths. Safe on the server and in
   the browser. */

import type { Lang } from "@/i18n";

/** "" for English, "/pt" for Portuguese. */
function prefix(lang: Lang): string {
  return lang === "en" ? "" : `/${lang}`;
}

/** An English path such as "/gaps/" in the given language. */
export function localePath(pathname: string, lang: Lang = "en"): string {
  return `${prefix(lang)}${pathname}`;
}

/** The English path of a path in the given language: "/pt/gaps/" becomes "/gaps/". */
export function englishPath(pathname: string, lang: Lang): string {
  const start = prefix(lang);
  if (!start) return pathname;
  if (pathname === start) return "/";
  return pathname.startsWith(`${start}/`) ? pathname.slice(start.length) : pathname;
}

/** A technology page; its id is "<domain>/<slug>". */
export function techPath(id: string, gap?: string, lang: Lang = "en"): string {
  const page = localePath(`/tech/${id}/`, lang);
  return gap ? `${page}?gap=${encodeURIComponent(gap)}` : page;
}

export function cardPath(key: string, lang: Lang = "en"): string {
  return localePath(`/evidence/${key}/`, lang);
}

export function domainPath(id: string, lang: Lang = "en"): string {
  return localePath(`/domain/${id}/`, lang);
}
