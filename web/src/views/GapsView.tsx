/* Every gap, filtered by domain, severity, type, layer and status. A port of gapsView() in
   site/app.js; the filters live in the query string. */

import type { Metadata } from "next";

import { GapCard } from "@/components/cards";
import { FilteredList, type Filter, type FilterRow } from "@/components/FilteredList";
import { TranslationNotice } from "@/components/ui";
import type { Lang } from "@/i18n";
import { SEVERITIES } from "@/lib/colors";
import { loadAtlas } from "@/lib/load";
import { pageMetadata } from "@/lib/site";

export function gapsMetadata(lang: Lang): Metadata {
  const t = loadAtlas(lang).t.gaps;
  return pageMetadata(lang, t.title, t.description, "/gaps/");
}

export function GapsView({ lang }: { lang: Lang }) {
  const atlas = loadAtlas(lang);
  const t = atlas.t.gaps;
  const all = atlas.data.technologies.flatMap((tech) => tech.gaps.map((g) => ({ gap: g, tech })));
  const severityRank = (s: string) => (SEVERITIES as readonly string[]).indexOf(s);
  all.sort((a, b) => severityRank(a.gap.severity) - severityRank(b.gap.severity) || a.tech.name.localeCompare(b.tech.name, lang));

  const filters: Filter[] = [
    {
      name: "domain",
      label: t.domain,
      options: [...atlas.domains.values()].filter((d) => all.some((r) => r.tech.domain === d.id)).map((d) => [d.id, d.name]),
    },
    { name: "severity", label: t.severity, options: SEVERITIES.map((s) => [s, atlas.label("severity", s)]) },
    { name: "type", label: t.type, options: atlas.vocabIds("gap_type").map((s) => [s, atlas.label("gap_type", s)]) },
    { name: "layer", label: t.layer, options: atlas.vocabIds("layer").map((s) => [s, atlas.label("layer", s)]) },
    { name: "status", label: t.status, options: atlas.vocabIds("gap_status").map((s) => [s, atlas.label("gap_status", s)]) },
  ];
  const rows: FilterRow[] = all.map(({ gap, tech }) => ({
    id: `${tech.id}#${gap.id}`,
    fields: { domain: tech.domain, severity: gap.severity, type: gap.type, layer: gap.layer, status: gap.status },
    text: `${gap.title} ${gap.description ?? ""} ${tech.name}`.toLowerCase(),
    node: <GapCard atlas={atlas} gap={gap} tech={tech} showOwner />,
  }));

  return (
    <>
      <TranslationNotice atlas={atlas} status={atlas.data.translation} />
      <h1>{t.title}</h1>
      <p className="muted">{t.text}</p>
      <FilteredList
        formId="gap-filters"
        countId="gap-count"
        listId="gap-list"
        filters={filters}
        placeholder={t.placeholder}
        noun={t.noun}
        empty={t.empty}
        rows={rows}
        words={atlas.t.filters}
      />
    </>
  );
}
