/* The dependency graph of every technology. A port of graphView() in site/app.js. */

import type { Metadata } from "next";

import { TechPanel } from "@/components/cards";
import { GraphExplorer } from "@/components/GraphExplorer";
import { TranslationNotice } from "@/components/ui";
import type { Lang } from "@/i18n";
import { loadAtlas } from "@/lib/load";
import { pageMetadata } from "@/lib/site";

export function graphMetadata(lang: Lang): Metadata {
  const t = loadAtlas(lang).t.graph;
  return pageMetadata(lang, t.title, t.description, "/graph/");
}

export function GraphView({ lang }: { lang: Lang }) {
  const atlas = loadAtlas(lang);
  const t = atlas.t.graph;
  const techs = atlas.data.technologies;
  return (
    <>
      <TranslationNotice atlas={atlas} status={atlas.data.translation} />
      <h1>{t.heading}</h1>
      <p className="muted">{t.text}</p>
      <GraphExplorer
        techs={techs.map((tech) => ({
          id: tech.id,
          name: tech.name,
          domain: tech.domain,
          status: tech.status,
          requires: tech.requires.map((r) => r.technology),
          required_by: tech.required_by.map((r) => r.technology),
        }))}
        domains={atlas.data.taxonomy.domains.map((d) => ({ id: d.id, name: d.name }))}
        panels={Object.fromEntries(techs.map((tech) => [tech.id, <TechPanel key={tech.id} atlas={atlas} tech={tech} />]))}
        lang={lang}
        t={t}
      />
    </>
  );
}
