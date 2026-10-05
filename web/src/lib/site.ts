/* Addresses and page metadata. Absolute URLs come from atlas.json `site`, so they keep the
   repository path (/escape-velocity/) whatever the build's base path is. */

import type { Metadata } from "next";

import { loadAtlas } from "./load";

/** The base path of this build ("" locally, "/escape-velocity" on Pages). */
export const BASE_PATH = process.env.PAGES_BASE_PATH ?? "";

/** A static file outside the Next routes (atlas.json, llms.txt), under the base path. */
export function staticFile(name: string): string {
  return `${BASE_PATH}/${name}`;
}

/** The absolute URL of a path such as "/tech/fusion/power/". */
export function absoluteUrl(pathname: string): string {
  const site = loadAtlas().data.site.replace(/\/?$/, "/");
  return site + pathname.replace(/^\//, "");
}

export const SITE_DESCRIPTION =
  "An open atlas of what each technology still needs to reach maturity: metrics, gaps, dependencies and the evidence behind every number.";

/** Title, description, Open Graph and canonical URL of a page. A null title is the home page. */
export function pageMetadata(title: string | null, description: string, pathname: string): Metadata {
  const url = absoluteUrl(pathname);
  return {
    title: title === null ? { absolute: "Escape Velocity" } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: title ?? "Escape Velocity",
      description,
      url,
      type: "website",
      siteName: "Escape Velocity",
    },
  };
}
