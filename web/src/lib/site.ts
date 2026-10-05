/* Addresses and page metadata. Absolute URLs come from atlas.json `site`, so they keep the
   repository path (/escape-velocity/) whatever the build's base path is. Every page declares its
   address in each language (hreflang), with English as the default. */

import type { Metadata } from "next";

import { DEFAULT_LANG, type Lang } from "@/i18n";

import { languageOf, loadAtlas, siteLanguages } from "./load";
import { localePath } from "./paths";

/** The base path of this build ("" locally, "/escape-velocity" on Pages). */
export const BASE_PATH = process.env.PAGES_BASE_PATH ?? "";

/** A static file outside the Next routes (atlas.json, llms.txt), under the base path. */
export function staticFile(name: string): string {
  return `${BASE_PATH}/${name}`;
}

/** The atlas file of a language under the base path: /atlas.json, /atlas.pt.json. */
export function atlasFile(lang: Lang): string {
  return staticFile(languageOf(lang).file);
}

/** The absolute URL of a path such as "/tech/fusion/power/". */
export function absoluteUrl(pathname: string): string {
  const site = loadAtlas().data.site.replace(/\/?$/, "/");
  return site + pathname.replace(/^\//, "");
}

/** The absolute URL of an English path in each language, keyed by tag, plus x-default (English). */
export function languageAlternates(pathname: string): Record<string, string> {
  const urls: Record<string, string> = {};
  siteLanguages().forEach((l) => {
    urls[l.tag] = absoluteUrl(localePath(pathname, l.id));
  });
  urls["x-default"] = absoluteUrl(localePath(pathname, DEFAULT_LANG));
  return urls;
}

/** Title, description, Open Graph, canonical URL and language alternates of a page. `pathname`
    is the English path; a null title is the home page. */
export function pageMetadata(lang: Lang, title: string | null, description: string, pathname: string): Metadata {
  const url = absoluteUrl(localePath(pathname, lang));
  return {
    title: title === null ? { absolute: "Escape Velocity" } : title,
    description,
    alternates: { canonical: url, languages: languageAlternates(pathname) },
    openGraph: {
      title: title ?? "Escape Velocity",
      description,
      url,
      type: "website",
      siteName: "Escape Velocity",
    },
  };
}
