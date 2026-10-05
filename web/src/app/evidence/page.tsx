/* Every evidence card, filtered by class, status and type. A port of evidenceView() in
   site/app.js; the filters live in the query string. */

import type { Metadata } from "next";

import { CardRow } from "@/components/cards";
import { FilteredList, type Filter, type FilterRow } from "@/components/FilteredList";
import { loadAtlas } from "@/lib/load";
import { pageMetadata } from "@/lib/site";

export function generateMetadata(): Metadata {
  return pageMetadata(
    "Evidence",
    "Every number in the atlas comes from a card: the source, a verbatim quote, the conditions and a class.",
    "/evidence/",
  );
}

export default function EvidencePage() {
  const atlas = loadAtlas();
  const cards = [...atlas.data.evidence].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.key.localeCompare(b.key));
  const filters: Filter[] = [
    { name: "class", label: "Class", options: atlas.vocabIds("evidence_class").map((v) => [v, v]) },
    { name: "status", label: "Status", options: atlas.vocabIds("evidence_status").map((v) => [v, v]) },
    { name: "type", label: "Type", options: atlas.vocabIds("evidence_type").map((v) => [v, v]) },
  ];
  const rows: FilterRow[] = cards.map((c) => ({
    id: c.key,
    fields: { class: c.class, status: c.status, type: c.type },
    text: `${c.key} ${c.title} ${(c.authors ?? []).join(" ")} ${c.venue}`.toLowerCase(),
    node: <CardRow atlas={atlas} card={c} />,
  }));
  return (
    <>
      <h1>Evidence</h1>
      <p className="muted">
        Every number in the atlas comes from a card: the source, a verbatim quote, the conditions and a class. Agents add
        cards as unverified or machine-checked; only a curator marks a card verified.
      </p>
      <FilteredList
        formId="card-filters"
        countId="card-count"
        listId="card-list"
        filters={filters}
        placeholder="Title, author, venue or key"
        noun="cards"
        empty="No card matches these filters."
        rows={rows}
      />
    </>
  );
}
