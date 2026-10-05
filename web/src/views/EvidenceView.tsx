/* Every evidence card, filtered by class, status and type. A port of evidenceView() in
   site/app.js; the filters live in the query string. */

import type { Metadata } from "next";

import { CardRow } from "@/components/cards";
import { FilteredList, type Filter, type FilterRow } from "@/components/FilteredList";
import { TranslationNotice } from "@/components/ui";
import type { Lang } from "@/i18n";
import { loadAtlas } from "@/lib/load";
import { pageMetadata } from "@/lib/site";

export function evidenceMetadata(lang: Lang): Metadata {
  const t = loadAtlas(lang).t.evidence;
  return pageMetadata(lang, t.title, t.description, "/evidence/");
}

export function EvidenceView({ lang }: { lang: Lang }) {
  const atlas = loadAtlas(lang);
  const t = atlas.t.evidence;
  const cards = [...atlas.data.evidence].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.key.localeCompare(b.key));
  const filters: Filter[] = [
    { name: "class", label: t.class, options: atlas.vocabIds("evidence_class").map((v) => [v, atlas.label("evidence_class", v)]) },
    { name: "status", label: t.status, options: atlas.vocabIds("evidence_status").map((v) => [v, atlas.label("evidence_status", v)]) },
    { name: "type", label: t.type, options: atlas.vocabIds("evidence_type").map((v) => [v, atlas.label("evidence_type", v)]) },
  ];
  const rows: FilterRow[] = cards.map((c) => ({
    id: c.key,
    fields: { class: c.class, status: c.status, type: c.type },
    text: `${c.key} ${c.title} ${(c.authors ?? []).join(" ")} ${c.venue}`.toLowerCase(),
    node: <CardRow atlas={atlas} card={c} />,
  }));
  return (
    <>
      <TranslationNotice atlas={atlas} status={atlas.data.translation} />
      <h1>{t.title}</h1>
      <p className="muted">{t.text}</p>
      <FilteredList
        formId="card-filters"
        countId="card-count"
        listId="card-list"
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
