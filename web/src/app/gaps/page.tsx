/* Every gap, filtered by domain, severity, type, layer and status. A port of gapsView() in
   site/app.js; the filters live in the query string. */

import type { Metadata } from "next";

import { GapCard } from "@/components/cards";
import { FilteredList, type Filter, type FilterRow } from "@/components/FilteredList";
import { SEVERITIES } from "@/lib/colors";
import { loadAtlas } from "@/lib/load";
import { pageMetadata } from "@/lib/site";

export function generateMetadata(): Metadata {
  return pageMetadata(
    "Gaps",
    "What stands between each technology and its target, classified by type, layer and severity.",
    "/gaps/",
  );
}

export default function GapsPage() {
  const atlas = loadAtlas();
  const all = atlas.data.technologies.flatMap((t) => t.gaps.map((g) => ({ gap: g, tech: t })));
  const severityRank = (s: string) => (SEVERITIES as readonly string[]).indexOf(s);
  all.sort((a, b) => severityRank(a.gap.severity) - severityRank(b.gap.severity) || a.tech.name.localeCompare(b.tech.name));

  const filters: Filter[] = [
    {
      name: "domain",
      label: "Domain",
      options: [...atlas.domains.values()].filter((d) => all.some((r) => r.tech.domain === d.id)).map((d) => [d.id, d.name]),
    },
    { name: "severity", label: "Severity", options: SEVERITIES.map((s) => [s, s]) },
    { name: "type", label: "Type", options: atlas.vocabIds("gap_type").map((s) => [s, s.replace(/-/g, " ")]) },
    { name: "layer", label: "Layer", options: atlas.vocabIds("layer").map((s) => [s, s]) },
    { name: "status", label: "Status", options: atlas.vocabIds("gap_status").map((s) => [s, s]) },
  ];
  const rows: FilterRow[] = all.map(({ gap, tech }) => ({
    id: `${tech.id}#${gap.id}`,
    fields: { domain: tech.domain, severity: gap.severity, type: gap.type, layer: gap.layer, status: gap.status },
    text: `${gap.title} ${gap.description ?? ""} ${tech.name}`.toLowerCase(),
    node: <GapCard atlas={atlas} gap={gap} tech={tech} showOwner />,
  }));

  return (
    <>
      <h1>Gaps</h1>
      <p className="muted">
        What stands between each technology and its target, classified by type, layer and severity. A gap held open by
        another technology points to it.
      </p>
      <FilteredList
        formId="gap-filters"
        countId="gap-count"
        listId="gap-list"
        filters={filters}
        placeholder="Words in the title or description"
        noun="gaps"
        empty="No gap matches these filters."
        rows={rows}
      />
    </>
  );
}
