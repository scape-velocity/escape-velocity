/* The dependency graph of every technology. A port of graphView() in site/app.js. */

import type { Metadata } from "next";

import { TechPanel } from "@/components/cards";
import { GraphExplorer } from "@/components/GraphExplorer";
import { loadAtlas } from "@/lib/load";
import { pageMetadata } from "@/lib/site";

export function generateMetadata(): Metadata {
  return pageMetadata(
    "Graph",
    "Every technology in the atlas and what it requires: a shared dependency shows up once, however many domains wait on it.",
    "/graph/",
  );
}

export default function GraphPage() {
  const atlas = loadAtlas();
  const techs = atlas.data.technologies;
  return (
    <>
      <h1>The dependency graph</h1>
      <p className="muted">
        Every technology in the atlas. An arrow goes from a technology to one it requires; a shared dependency shows up
        once, however many domains wait on it. Dashed nodes are proposed and not yet mapped.
      </p>
      <GraphExplorer
        techs={techs.map((t) => ({
          id: t.id,
          name: t.name,
          domain: t.domain,
          status: t.status,
          requires: t.requires.map((r) => r.technology),
          required_by: t.required_by.map((r) => r.technology),
        }))}
        domains={atlas.data.taxonomy.domains.map((d) => ({ id: d.id, name: d.name }))}
        panels={Object.fromEntries(techs.map((t) => [t.id, <TechPanel key={t.id} atlas={atlas} tech={t} />]))}
      />
    </>
  );
}
