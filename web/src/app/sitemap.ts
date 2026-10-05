/* sitemap.xml: every page of the explorer, as absolute URLs under atlas.json `site`. */

import type { MetadataRoute } from "next";

import { loadAtlas } from "@/lib/load";
import { cardPath, domainPath, techPath } from "@/lib/paths";
import { absoluteUrl } from "@/lib/site";

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
    ...data.taxonomy.domains.map((d) => domainPath(d.id)),
    ...data.technologies.map((t) => techPath(t.id)),
    ...data.evidence.map((c) => cardPath(c.key)),
  ];
  return paths.map((path) => ({ url: absoluteUrl(path), lastModified }));
}
