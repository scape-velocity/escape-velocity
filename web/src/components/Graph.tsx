"use client";

/* A Cytoscape graph of technologies, ported from buildGraph() in site/app.js. Cytoscape is loaded
   in an effect, so the static HTML holds only the empty box; the instance is destroyed on unmount
   and restyled from the CSS tokens whenever the theme changes (toggle or system). */

import type cytoscape from "cytoscape";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { domainColor } from "@/lib/colors";
import { domainGridPositions, graphStyle, type GraphDomain, type GraphTech } from "@/lib/graph";
import { techPath } from "@/lib/paths";

export interface GraphProps {
  techs: GraphTech[];
  domains: GraphDomain[];
  /** The technologies to draw; all of `techs` when omitted. */
  ids?: string[];
  focus?: string;
  layout: "tree" | "grid" | "cose";
  /** With a handler, a tap selects instead of opening the technology. */
  onSelect?: (id: string) => void;
  onClear?: () => void;
  /** The selected technology: everything outside its neighborhood is faded. */
  selected?: string | null;
  className: string;
  label: string;
}

export function Graph({ techs, domains, ids, focus, layout, onSelect, onClear, selected, className, label }: GraphProps) {
  const container = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [cy, setCy] = useState<cytoscape.Core | null>(null);
  const [failed, setFailed] = useState(false);
  const handlers = useRef({ onSelect, onClear });
  handlers.current = { onSelect, onClear };

  const shown = ids ?? techs.map((t) => t.id);
  const key = `${layout}|${focus ?? ""}|${shown.join(",")}`;

  useEffect(() => {
    const box = container.current;
    if (!box) return;
    let instance: cytoscape.Core | null = null;
    let cancelled = false;
    const byId = new Map(techs.map((t) => [t.id, t]));
    const list = shown.filter((id) => byId.has(id));
    const set = new Set(list);
    const group = layout === "grid";
    const domainNames = new Map(domains.map((d) => [d.id, d.name]));

    const elements: cytoscape.ElementDefinition[] = [];
    if (group) {
      [...new Set(list.map((id) => (byId.get(id) as GraphTech).domain))].forEach((d) => {
        elements.push({ data: { id: `domain:${d}`, label: domainNames.get(d) ?? d, color: domainColor(d), isDomain: true } });
      });
    }
    list.forEach((id) => {
      const tech = byId.get(id) as GraphTech;
      elements.push({
        data: {
          id,
          label: tech.name,
          color: domainColor(tech.domain),
          status: tech.status,
          weight: tech.requires.length + tech.required_by.length,
          focus: id === focus,
          ...(group ? { parent: `domain:${tech.domain}` } : {}),
        },
      });
    });
    list.forEach((id) => {
      (byId.get(id) as GraphTech).requires.forEach((other) => {
        if (set.has(other)) elements.push({ data: { id: `${id}->${other}`, source: id, target: other } });
      });
    });

    let layoutOptions: cytoscape.LayoutOptions;
    if (layout === "tree") {
      layoutOptions = {
        name: "breadthfirst",
        directed: true,
        padding: 24,
        spacingFactor: 1.05,
        animate: false,
        roots: list.filter((id) => !(byId.get(id) as GraphTech).required_by.some((r) => set.has(r))),
      };
    } else if (group) {
      layoutOptions = {
        name: "preset",
        positions: domainGridPositions(
          list,
          byId,
          domains.map((d) => d.id),
          box.clientWidth,
          box.clientHeight,
        ),
        padding: 24,
        fit: true,
      };
    } else {
      layoutOptions = {
        name: "cose",
        animate: false,
        padding: 24,
        randomize: true,
        nodeRepulsion: () => 6000,
        idealEdgeLength: () => 60,
        gravity: 0.8,
        componentSpacing: 40,
        nodeOverlap: 16,
        numIter: 2000,
      } as cytoscape.LayoutOptions;
    }

    import("cytoscape")
      .then(({ default: cytoscapeLib }) => {
        if (cancelled) return;
        instance = cytoscapeLib({
          container: box,
          elements,
          style: graphStyle(),
          layout: layoutOptions,
          minZoom: 0.1,
          maxZoom: 3,
          boxSelectionEnabled: false,
          autoungrabify: false,
        });
        instance.on("tap", "node", (event) => {
          const node = event.target as cytoscape.NodeSingular;
          if (node.data("isDomain")) return;
          if (handlers.current.onSelect) handlers.current.onSelect(node.id());
          else router.push(techPath(node.id()));
        });
        instance.on("tap", (event) => {
          if (event.target === instance) handlers.current.onClear?.();
        });
        setCy(instance);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      setCy(null);
      instance?.destroy();
    };
    // The key holds the ids, the layout and the focus; techs and domains are the same for a page.
  }, [key]);

  // The colors are CSS tokens: restyle when the toggle sets data-theme or the system theme changes.
  useEffect(() => {
    if (!cy) return;
    const restyle = () => cy.style(graphStyle());
    const observer = new MutationObserver(restyle);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", restyle);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", restyle);
    };
  }, [cy]);

  useEffect(() => {
    if (!cy) return;
    cy.elements().removeClass("faded");
    if (!selected) return;
    const node = cy.getElementById(selected);
    if (node.empty()) return;
    cy.elements().addClass("faded");
    node.closedNeighborhood().removeClass("faded");
    node.ancestors().removeClass("faded");
    node.closedNeighborhood().nodes().ancestors().removeClass("faded");
  }, [cy, selected]);

  return (
    <div className={className} ref={container} aria-label={label}>
      {failed ? (
        <p className="empty" style={{ padding: 16 }}>
          The graph library did not load.
        </p>
      ) : null}
    </div>
  );
}
