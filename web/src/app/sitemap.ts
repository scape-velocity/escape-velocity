/* sitemap.xml: every page of the explorer in every language, as absolute URLs under atlas.json
   `site`, each with its addresses in the other languages. */

import type { MetadataRoute } from "next";

import { loadAtlas, siteLanguages } from "@/lib/load";
import { cardPath, domainPath, localePath, techPath } from "@/lib/paths";
import { absoluteUrl, languageAlternates } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const data = loadAtlas().data;
  const lastModified = data.version_date ?? undefined;
  const paths = [
    "/",
    "/graph/",
    "/gaps/",
    "/evidence/",
    "/about/",
    "/contribute/",
    ...data.taxonomy.domains.map((d) => domainPath(d.id)),
    ...data.technologies.map((t) => techPath(t.id)),
    ...data.evidence.map((c) => cardPath(c.key)),
  ];
  return siteLanguages().flatMap((lang) =>
    paths.map((path) => ({
      url: absoluteUrl(localePath(path, lang.id)),
      lastModified,
      alternates: { languages: languageAlternates(path) },
    })),
  );
}
