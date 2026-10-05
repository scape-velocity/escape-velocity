"use client";

/* The graph page: every technology, the options, the domain legend and the side panel. A port of
   graphView() in site/app.js. The panels are rendered on the server, one per technology. */

import { useState, type CSSProperties, type ReactNode } from "react";

import { domainColor } from "@/lib/colors";
import type { GraphDomain, GraphTech } from "@/lib/graph";

import { Graph } from "./Graph";

const EMPTY_PANEL = "Select a technology to see what it requires and what waits on it.";

export function GraphExplorer({
  techs,
  domains,
  panels,
}: {
  techs: GraphTech[];
  domains: GraphDomain[];
  panels: Record<string, ReactNode>;
}) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [group, setGroup] = useState(true);
  const [showProposed, setShowProposed] = useState(true);
  const [showIsolated, setShowIsolated] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const ids = techs
    .filter((t) => !hidden.has(t.domain))
    .filter((t) => showProposed || t.status !== "proposed")
    .filter((t) => showIsolated || t.requires.length || t.required_by.length)
    .map((t) => t.id);

  // Every redraw starts with the panel cleared, as in the vanilla explorer.
  const redraw = (change: () => void) => {
    change();
    setSelected(null);
  };

  const toggleDomain = (id: string) =>
    redraw(() =>
      setHidden((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    );

  return (
    <div className="graph-layout">
      <Graph
        className="graph-box graph-full"
        label="Dependency graph of every technology"
        techs={techs}
        domains={domains}
        ids={ids}
        layout={group ? "grid" : "cose"}
        selected={selected}
        onSelect={setSelected}
        onClear={() => setSelected(null)}
      />
      <aside className="graph-side">
        <div className="card" id="graph-panel">
          {selected && panels[selected] ? (
            panels[selected]
          ) : (
            <p className="muted small" style={{ margin: 0 }}>
              {EMPTY_PANEL}
            </p>
          )}
        </div>
        <div className="card">
          <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={group} onChange={(e) => redraw(() => setGroup(e.target.checked))} /> Group by domain
          </label>
          <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={showProposed} onChange={(e) => redraw(() => setShowProposed(e.target.checked))} /> Show
            proposed
          </label>
          <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={showIsolated} onChange={(e) => redraw(() => setShowIsolated(e.target.checked))} /> Show
            technologies without links
          </label>
        </div>
        <div className="card">
          <div className="small muted" style={{ marginBottom: 6 }}>
            Domains (select to hide)
          </div>
          <div className="legend">
            {domains.map((d) => (
              <button key={d.id} type="button" className={hidden.has(d.id) ? "off" : undefined} onClick={() => toggleDomain(d.id)}>
                <span className="domain-swatch" style={{ "--d": domainColor(d.id) } as CSSProperties} />
                {d.name}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
