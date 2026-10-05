/* Graph data and Cytoscape styles, ported from site/app.js (buildGraph, graphStyle,
   domainGridPositions). Browser only at run time: the styles read the CSS tokens of the page. */

import type cytoscape from "cytoscape";

/** What the graph needs of a technology. */
export interface GraphTech {
  id: string;
  name: string;
  domain: string;
  status: string;
  requires: string[];
  required_by: string[];
}

export interface GraphDomain {
  id: string;
  name: string;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** The colors of the current theme, read from the tokens of style.css. */
export function graphColors() {
  return {
    text: cssVar("--text"),
    muted: cssVar("--muted"),
    surface: cssVar("--surface"),
    edge: cssVar("--border-strong"),
    accent: cssVar("--accent"),
  };
}

export function graphStyle(): cytoscape.StylesheetJson {
  const c = graphColors();
  const font = getComputedStyle(document.body).fontFamily || '"Source Sans 3", sans-serif';
  return [
    {
      selector: "node",
      style: {
        "background-color": "data(color)",
        label: "data(label)",
        color: c.text,
        "font-family": font,
        "font-size": 12,
        "text-wrap": "wrap",
        "text-max-width": "120",
        "text-valign": "bottom",
        "text-margin-y": 4,
        "border-width": 2,
        "border-color": c.surface,
        "text-outline-color": c.surface,
        "text-outline-width": 2,
        "text-outline-opacity": 0.85,
      },
    },
    { selector: "node[weight]", style: { width: "mapData(weight, 0, 5, 16, 34)", height: "mapData(weight, 0, 5, 16, 34)" } },
    {
      selector: 'node[status = "proposed"]',
      style: { "background-opacity": 0.3, "border-style": "dashed", "border-color": "data(color)" },
    },
    { selector: "node[?focus]", style: { "border-width": 4, "border-color": c.text, "font-weight": 700 } },
    {
      selector: "node[?isDomain]",
      style: {
        shape: "round-rectangle",
        "background-color": "data(color)",
        "background-opacity": 0.07,
        "border-width": 1,
        "border-style": "solid",
        "border-color": "data(color)",
        "border-opacity": 0.6,
        label: "data(label)",
        "text-valign": "top",
        "text-halign": "center",
        "text-margin-y": -4,
        "font-size": 12,
        "font-weight": 600,
        color: c.muted,
        padding: "12",
      },
    },
    {
      selector: "edge",
      style: {
        width: 1.6,
        "line-color": c.edge,
        "target-arrow-color": c.edge,
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        "arrow-scale": 0.9,
      },
    },
    { selector: "node:selected", style: { "border-width": 4, "border-color": c.accent } },
    { selector: ".faded", style: { opacity: 0.15 } },
    { selector: ".hidden", style: { display: "none" } },
  ] as cytoscape.StylesheetJson;
}

/* Domains as boxes packed into columns, each box a stack of its technologies. Deterministic, so the
   picture is the same on every visit; a force layout with compound nodes scattered them. */
export function domainGridPositions(
  ids: string[],
  techs: Map<string, GraphTech>,
  domainOrder: string[],
  width: number,
  height: number,
): Record<string, { x: number; y: number }> {
  const byDomain = new Map<string, string[]>();
  ids.forEach((id) => {
    const domain = (techs.get(id) as GraphTech).domain;
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    (byDomain.get(domain) as string[]).push(id);
  });
  const order = domainOrder.filter((d) => byDomain.has(d));
  const blockHeight = (domain: string) => (byDomain.get(domain) as string[]).length * 64 + 76;
  // Largest domains first into the shortest column balances the heights; each column then lists
  // its domains in taxonomy order. The column count is the one that fits the box at the largest zoom.
  const pack = (columns: number) => {
    const heights = new Array<number>(columns).fill(0);
    const assigned: string[][] = Array.from({ length: columns }, () => []);
    [...order]
      .sort((a, b) => blockHeight(b) - blockHeight(a))
      .forEach((domain) => {
        const column = heights.indexOf(Math.min(...heights));
        assigned[column].push(domain);
        heights[column] += blockHeight(domain);
      });
    const zoom = Math.min(width / (columns * 190), height / Math.max(...heights));
    return { assigned, zoom };
  };
  let best = pack(2);
  for (let columns = 3; columns <= Math.min(6, order.length); columns += 1) {
    const candidate = pack(columns);
    if (candidate.zoom > best.zoom) best = candidate;
  }
  const positions: Record<string, { x: number; y: number }> = {};
  best.assigned.forEach((domains, column) => {
    let y = 0;
    domains
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))
      .forEach((domain) => {
        (byDomain.get(domain) as string[]).forEach((id, k) => {
          positions[id] = { x: column * 190, y: y + k * 64 };
        });
        y += blockHeight(domain);
      });
  });
  return positions;
}
