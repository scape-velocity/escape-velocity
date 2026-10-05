/* Escape Velocity explorer. Reads atlas.json (built by tools/build_site.py) and renders every view
   on the client. No build step; Cytoscape.js is the only library. */

"use strict";

const DOMAIN_COLORS = {
  computing: "#2780e3",
  quantum: "#7b4fd6",
  ai: "#d63384",
  health: "#e03131",
  biotech: "#2f9e44",
  neurotech: "#f76707",
  energy: "#e0a100",
  climate: "#0c9da8",
  materials: "#9c6b3f",
  water: "#4c6ef5",
  food: "#74b816",
  space: "#868e96",
  enablers: "#a61e4d",
};
const SEVERITIES = ["critical", "high", "medium", "low"];
const STATUSES = ["tracked", "mapped", "scoping", "proposed", "achieved", "retired"];
const SUPERSCRIPT = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };

const state = {
  data: null,
  techs: new Map(),
  cards: new Map(),
  domains: new Map(),
  metrics: new Map(),
  scales: new Map(),
  vocab: {},
  graphs: [],
};

/* ---------- HTML helpers ---------- */

class Raw {
  constructor(html) { this.html = html; }
  toString() { return this.html; }
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function part(value) {
  if (value === null || value === undefined || value === false) return "";
  if (value instanceof Raw) return value.html;
  if (Array.isArray(value)) return value.map(part).join("");
  return esc(value);
}

function h(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => { out += part(value) + strings[i + 1]; });
  return new Raw(out);
}

function paragraphs(text) {
  if (!text) return "";
  return text.trim().split(/\n\s*\n/).map((block) => h`<p>${block.replace(/\s+/g, " ")}</p>`);
}

function oneLine(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function firstSentence(text) {
  const line = oneLine(text);
  const match = line.match(/^(.+?[.!?])(\s|$)/);
  return match ? match[1] : line;
}

function fmtNumber(value) {
  if (typeof value !== "number") return String(value);
  if (Number.isInteger(value) && Math.abs(value) < 1e6) return value.toLocaleString("en-US").replace(/,/g, " ");
  if (value === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  if (exponent >= -3 && exponent <= 5) return String(Number(value.toPrecision(6)));
  const mantissa = Number((value / 10 ** exponent).toPrecision(3));
  const sup = String(exponent).split("").map((c) => SUPERSCRIPT[c] || c).join("");
  return mantissa === 1 ? `10${sup}` : `${mantissa} × 10${sup}`;
}

function prettyUnit(unit) {
  return unit.replace(/\^(-?\d+)/g, (_, exp) => exp.split("").map((c) => SUPERSCRIPT[c] || c).join(""));
}

function fmtValue(value, unit) {
  if (value === null || value === undefined) return "–";
  const number = fmtNumber(value);
  if (!unit || unit === "1") return number;
  if (unit === "%") return `${number}%`;
  return `${number} ${prettyUnit(unit)}`;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function domainColor(domainId) {
  return DOMAIN_COLORS[domainId] || "#868e96";
}

function meaning(field, id) {
  return (state.vocab[field] || {})[id] || "";
}

function levelName(tech, level) {
  const domain = state.domains.get(tech.domain) || {};
  const scale = state.scales.get(tech.readiness_scale || domain.readiness_scale);
  if (!scale || level === undefined || level === null) return level === undefined || level === null ? "not assessed" : `level ${level}`;
  const found = (scale.level || []).find((item) => item.level === level);
  return found ? found.name : `level ${level}`;
}

function headline(tech) {
  return tech.metrics.find((m) => m.headline) || null;
}

function openGaps(tech) {
  return tech.gaps.filter((g) => g.status !== "closed");
}

function techLink(id) {
  const tech = state.techs.get(id);
  return tech ? h`<a href="#/tech/${tech.id}">${tech.name}</a>` : h`<span class="mono">${id}</span>`;
}

function evidenceLinks(keys) {
  if (!keys || !keys.length) return "";
  return h`<div class="evidence-links">${keys.map((key) => h`<a href="#/evidence/${key}" title="${(state.cards.get(key) || {}).title || key}">${key}</a>`)}</div>`;
}

function chip(text, cls, title) {
  return h`<span class="chip dot ${cls || ""}" title="${title || ""}">${text}</span>`;
}

function statusChip(status) {
  return chip(status, `status-${status}`, meaning("technology_status", status));
}

function severityChip(severity) {
  return chip(severity, `sev-${severity}`, meaning("severity", severity));
}

function plainChip(text, title) {
  return h`<span class="chip" title="${title || ""}">${text}</span>`;
}

/* ---------- Routing ---------- */

function parseHash() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [path, query = ""] = hash.split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  return { parts, params: new URLSearchParams(query) };
}

function setTitle(text) {
  document.title = text ? `${text} | Escape Velocity` : "Escape Velocity";
}

function setActiveNav(route) {
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === route));
}

function destroyGraphs() {
  state.graphs.forEach((cy) => cy.destroy());
  state.graphs = [];
}

function route() {
  const { parts, params } = parseHash();
  const main = document.getElementById("main");
  destroyGraphs();
  const [section, ...rest] = parts;
  let view;
  if (!section) view = ["overview", overviewView];
  else if (section === "tech") view = ["overview", () => techView(rest.join("/"), params)];
  else if (section === "domain") view = ["overview", () => domainView(rest[0])];
  else if (section === "graph") view = ["graph", graphView];
  else if (section === "gaps") view = ["gaps", () => gapsView(params)];
  else if (section === "evidence" && rest.length) view = ["evidence", () => cardView(rest.join("/"))];
  else if (section === "evidence") view = ["evidence", () => evidenceView(params)];
  else if (section === "about") view = ["about", aboutView];
  else view = ["", notFound];
  setActiveNav(view[0]);
  const result = view[1]();
  main.innerHTML = part(result.html);
  if (result.after) result.after(main);
  if (!result.keepScroll) window.scrollTo(0, 0);
}

function notFound() {
  setTitle("Not found");
  return { html: h`<h1>Not found</h1><p>Nothing at this address. <a href="#/">Back to the overview</a>.</p>` };
}

/* ---------- Overview ---------- */

function overviewView() {
  setTitle("");
  const data = state.data;
  const techs = data.technologies;
  const gaps = techs.flatMap((t) => openGaps(t).map((g) => ({ ...g, tech: t })));
  const critical = gaps.filter((g) => g.severity === "critical");
  const verified = data.evidence.filter((c) => c.status === "verified").length;
  const mappedOrBetter = techs.filter((t) => ["mapped", "tracked", "achieved"].includes(t.status)).length;

  const withGap = techs
    .map((t) => ({ tech: t, metric: headline(t) }))
    .filter((r) => r.metric && r.metric.gap_to_target !== null && r.metric.gap_to_target !== undefined);
  const logRows = withGap.filter((r) => (state.metrics.get(r.metric.metric) || {}).scale === "log")
    .sort((a, b) => b.metric.gap_to_target - a.metric.gap_to_target);
  const linearRows = withGap.filter((r) => (state.metrics.get(r.metric.metric) || {}).scale !== "log")
    .sort((a, b) => b.metric.gap_to_target - a.metric.gap_to_target);
  const maxOrders = Math.max(1, Math.ceil(Math.max(0, ...logRows.map((r) => r.metric.gap_to_target))));

  const depended = techs
    .filter((t) => t.required_by.length)
    .sort((a, b) => b.dependent_domains.length - a.dependent_domains.length || b.dependents.length - a.dependents.length || b.blocks.length - a.blocks.length)
    .slice(0, 8);

  const html = h`
    <section class="hero">
      <h1>What each technology still needs</h1>
      <p class="lede">Escape Velocity is an open atlas of technologies on their way to maturity: where each one
      stands, the target that would make it useful, the physical limit behind that target, the gaps in
      between and the other technologies it waits on. Every number has a source.</p>
    </section>
    <div class="stats">
      <div class="stat"><b>${techs.length}</b><span>technologies, ${mappedOrBetter} fully mapped</span></div>
      <div class="stat"><b>${state.domains.size}</b><span>domains</span></div>
      <div class="stat"><b>${gaps.length}</b><span>open gaps, ${critical.length} critical</span></div>
      <div class="stat"><b>${data.evidence.length}</b><span>evidence cards, ${verified} verified by a curator</span></div>
    </div>

    <div class="section-head"><h2>Distance to target</h2><a href="#/gaps">All gaps</a></div>
    <p class="muted small">The headline metric of each technology: how far the best demonstrated value is from the
    target, in orders of magnitude. Open a technology for the conditions and the evidence behind each value.</p>
    ${logRows.length ? barChart(logRows, maxOrders, "orders of magnitude") : h`<p class="empty">No headline metric has both a current value and a target yet.</p>`}
    ${linearRows.length ? h`<h3 style="margin-top:1.4rem">Percentage metrics</h3>${barChart(linearRows, 100, "percentage points")}` : ""}

    <div class="section-head"><h2>Domains</h2><a href="#/graph">See the graph</a></div>
    <div class="grid grid-domains">${[...state.domains.values()].map(domainCard)}</div>

    <div class="grid grid-two" style="margin-top:2rem">
      <section class="card">
        <h2 style="margin-top:0">Critical gaps</h2>
        ${critical.length ? h`<ol class="rank">${critical.map((g) => h`
          <li><div><a href="#/tech/${g.tech.id}?gap=${g.id}">${g.title}</a>
          <div class="muted">${g.tech.name} &middot; ${g.type.replace(/-/g, " ")} &middot; ${g.layer}</div></div></li>`)}</ol>`
          : h`<p class="empty">No critical gaps recorded.</p>`}
      </section>
      <section class="card">
        <h2 style="margin-top:0">Most depended on</h2>
        ${depended.length ? h`<ol class="rank">${depended.map((t) => h`
          <li><div><a href="#/tech/${t.id}">${t.name}</a>
          <div class="muted">needed by ${t.required_by.map((r, i) => h`${i ? ", " : ""}${(state.techs.get(r.technology) || {}).name || r.technology}`)}${t.blocks.length ? h` &middot; holds open ${t.blocks.length} gap${t.blocks.length > 1 ? "s" : ""}` : ""}</div></div></li>`)}</ol>`
          : h`<p class="empty">No dependencies recorded yet.</p>`}
      </section>
    </div>`;
  return { html };
}

function barChart(rows, max, unitLabel) {
  const ticks = unitLabel === "orders of magnitude"
    ? Array.from({ length: Math.min(max, 12) + 1 }, (_, i) => Math.round((i * max) / Math.min(max, 12)))
    : [0, 25, 50, 75, 100];
  return h`<div class="bars">
    ${rows.map(({ tech, metric }) => {
      const def = state.metrics.get(metric.metric) || {};
      const size = metric.gap_to_target;
      const met = size <= 0;
      const width = met ? 100 : Math.max(1.5, Math.min(100, (size / max) * 100));
      return h`<div class="bar-row">
        <div class="bar-label"><a href="#/tech/${tech.id}">${tech.name}</a>
          <span class="muted">${def.name || metric.metric}: ${metric.display.current} now, ${metric.display.target} target</span></div>
        <div class="bar-track" role="img" aria-label="${tech.name}: ${metric.display.gap_to_target} to target">
          <div class="bar-fill" style="width:${width.toFixed(1)}%;--d:${met ? cssVar("--ok") : domainColor(tech.domain)}"></div>
          <span class="bar-text">${metric.display.gap_to_target}</span>
        </div>
      </div>`;
    })}
    <div class="bar-ticks"><div></div><div>${ticks.map((t) => h`<span>${t}</span>`)}</div></div>
  </div>`;
}

function domainCard(domain) {
  const techs = state.data.technologies.filter((t) => t.domain === domain.id);
  const gaps = techs.reduce((n, t) => n + openGaps(t).length, 0);
  return h`<article class="card domain-card">
    <h3><span class="domain-swatch" style="--d:${domainColor(domain.id)}"></span><a href="#/domain/${domain.id}">${domain.name}</a></h3>
    <p>${domain.summary}</p>
    <p class="small muted">${techs.length} technolog${techs.length === 1 ? "y" : "ies"} &middot; ${gaps} open gap${gaps === 1 ? "" : "s"}</p>
    <ul class="tech-list">${techs.map((t) => {
      const m = headline(t);
      const note = m && m.display.gap_to_target ? (m.display.gap_to_target === "met" ? "met" : `${m.display.gap_to_target.replace("orders of magnitude", "orders")} to go`) : "";
      return h`<li><a href="#/tech/${t.id}"><span class="status-dot status-${t.status}" title="${t.status}"></span>${t.name}</a><span class="gap-note">${note}</span></li>`;
    })}</ul>
  </article>`;
}

/* ---------- Domain ---------- */

function domainView(domainId) {
  const domain = state.domains.get(domainId);
  if (!domain) return notFound();
  setTitle(domain.name);
  const techs = state.data.technologies.filter((t) => t.domain === domainId);
  const scale = state.scales.get(domain.readiness_scale);
  const sdgs = (domain.sdgs || []).map((id) => (state.data.taxonomy.sdgs.find((s) => s.id === id) || {}).name).filter(Boolean);
  return { html: h`
    <p class="eyebrow"><a href="#/">Overview</a> / Domain</p>
    <h1><span class="domain-swatch" style="--d:${domainColor(domainId)};width:16px;height:16px"></span> ${domain.name}</h1>
    <p class="lede">${domain.summary}</p>
    <div class="chips">
      ${scale ? plainChip(`Readiness on ${scale.name}`, scale.summary) : ""}
      ${sdgs.map((name) => plainChip(`SDG: ${name}`))}
    </div>
    <div class="stack" style="margin-top:1.2rem">${techs.map((t) => {
      const m = headline(t);
      return h`<article class="card">
        <div class="card-title"><h3><a href="#/tech/${t.id}">${t.name}</a></h3>${statusChip(t.status)}</div>
        <p class="muted" style="margin:6px 0">${firstSentence(t.statement)}</p>
        <p class="small" style="margin:0">
          ${m ? h`<b>${(state.metrics.get(m.metric) || {}).name || m.metric}</b>: ${m.display.current || "no current value"}${m.display.target ? h` now, target ${m.display.target}` : ""}${m.display.gap_to_target ? h` (${m.display.gap_to_target})` : ""} &middot; ` : ""}
          ${openGaps(t).length} open gap${openGaps(t).length === 1 ? "" : "s"} &middot; ${t.readiness_name}
        </p>
      </article>`;
    })}</div>` };
}

/* ---------- Technology ---------- */

function techView(id, params) {
  const tech = state.techs.get(id);
  if (!tech) return notFound();
  setTitle(tech.name);
  const domain = state.domains.get(tech.domain) || { name: tech.domain };
  const sdgs = (tech.sdgs || []).map((n) => (state.data.taxonomy.sdgs.find((s) => s.id === n) || {}).name).filter(Boolean);
  const cited = tech.evidence.map((key) => state.cards.get(key)).filter(Boolean);
  const neighborhood = new Set([tech.id, ...transitive(tech.id, "down"), ...transitive(tech.id, "up")]);
  const hasGraph = neighborhood.size > 1;

  const html = h`
    <p class="eyebrow"><span class="domain-swatch" style="--d:${domainColor(tech.domain)}"></span>
      <a href="#/domain/${tech.domain}">${domain.name}</a> / <span class="mono">${tech.id}</span></p>
    <div class="tech-head">
      <h1>${tech.name}</h1>
      <div class="chips">
        ${statusChip(tech.status)}
        ${plainChip(tech.readiness_name, "Readiness level")}
        ${tech.horizon ? plainChip(`horizon ${tech.horizon}`) : ""}
        ${tech.worst_open_severity ? chip(`${tech.worst_open_severity} gap open`, `sev-${tech.worst_open_severity}`, "The most severe open gap") : ""}
      </div>
    </div>
    <div class="statement">${paragraphs(tech.statement)}</div>
    ${tech.scope ? h`<details class="scope"><summary>Scope</summary>${paragraphs(tech.scope)}</details>` : ""}
    <dl class="facts">
      <div><dt>Readiness</dt><dd>${tech.readiness_name}${tech.readiness_note ? h`<div class="small muted">${oneLine(tech.readiness_note)}</div>` : ""}${evidenceLinks(tech.readiness_evidence)}</dd></div>
      <div><dt>Serves</dt><dd>${sdgs.length ? sdgs.join(", ") : "–"}</dd></div>
      <div><dt>Last reviewed</dt><dd>${tech.last_reviewed || "never"}</dd></div>
      <div><dt>Curators</dt><dd>${tech.curators && tech.curators.length ? tech.curators.join(", ") : h`none yet: <a href="${state.data.repository}/blob/main/CONTRIBUTING.md">volunteer</a>`}</dd></div>
    </dl>
    ${tech.status === "proposed" ? h`<p class="notice">Proposed: the statement and scope are written, but the metrics, target or gaps are not complete yet. One sourced number is a real contribution.</p>` : ""}

    <h2>Metrics</h2>
    ${tech.metrics.length ? h`<div class="grid grid-two">${tech.metrics.map((m) => metricCard(m))}</div>` : h`<p class="empty">No metric yet.</p>`}

    <h2>Gaps</h2>
    ${tech.gaps.length ? h`<div class="stack">${tech.gaps.map((g) => gapCard(g, tech, false))}</div>` : h`<p class="empty">No gap recorded yet.</p>`}

    <h2>Dependencies</h2>
    <div class="grid grid-two">
      <div>
        <h3>Requires</h3>
        ${tech.requires.length ? h`<ul class="deps">${tech.requires.map((r) => h`<li><b>${techLink(r.technology)}</b>
          <span class="why">${oneLine(r.why)}${r.need ? h` Need: ${oneLine(r.need)}` : ""}</span></li>`)}</ul>` : h`<p class="empty">Nothing recorded.</p>`}
        <h3 style="margin-top:1.2rem">Required by</h3>
        ${tech.required_by.length ? h`<ul class="deps">${tech.required_by.map((r) => h`<li><b>${techLink(r.technology)}</b>
          <span class="why">${oneLine(r.why)}${r.need ? h` Need: ${oneLine(r.need)}` : ""}</span></li>`)}</ul>` : h`<p class="empty">Nothing in the atlas depends on it yet.</p>`}
        ${tech.blocks.length ? h`<h3 style="margin-top:1.2rem">Holds open</h3><ul class="deps">${tech.blocks.map((b) => h`<li><a href="#/tech/${b.technology}?gap=${b.gap}">${b.title}</a><span class="why">${(state.techs.get(b.technology) || {}).name || b.technology}</span></li>`)}</ul>` : ""}
      </div>
      <div>${hasGraph ? h`<div class="graph-box" id="tech-graph" aria-label="Dependency graph around ${tech.name}"></div>
        <p class="small muted">Arrows point from a technology to what it requires. Select a node to open it.</p>` : ""}</div>
    </div>

    <h2>Evidence</h2>
    ${cited.length ? h`<div class="stack">${cited.map(cardRow)}</div>` : h`<p class="empty">No evidence cited yet.</p>`}

    ${tech.alan_machine.length ? h`<h2>In The Alan Machine</h2><ul>${tech.alan_machine.map((item) => h`<li><a href="${item.url}">${item.title}</a></li>`)}</ul>` : ""}

    <p class="small muted" style="margin-top:2rem">
      <a href="${tech.source}">Source TOML</a> &middot; <a href="${tech.page}">Page on GitHub</a> &middot;
      <a href="${state.data.repository}/issues/new/choose">Suggest a correction</a>
    </p>`;

  return {
    html,
    after(root) {
      if (hasGraph) {
        const container = root.querySelector("#tech-graph");
        const cy = buildGraph(container, [...neighborhood], { focus: tech.id, layout: "tree" });
        if (cy) state.graphs.push(cy);
      }
      const gapId = params.get("gap");
      if (gapId) {
        const target = root.querySelector(`#gap-${CSS.escape(gapId)}`);
        if (target) setTimeout(() => target.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
        return;
      }
    },
  };
}

function transitive(id, direction) {
  const seen = new Set();
  const stack = [id];
  while (stack.length) {
    const tech = state.techs.get(stack.pop());
    if (!tech) continue;
    const next = direction === "down" ? tech.requires.map((r) => r.technology) : tech.required_by.map((r) => r.technology);
    next.forEach((other) => {
      if (state.techs.has(other) && !seen.has(other) && other !== id) {
        seen.add(other);
        stack.push(other);
      }
    });
  }
  return seen;
}

function metricCard(metric) {
  const def = state.metrics.get(metric.metric) || { name: metric.metric, unit: "" };
  const size = metric.gap_to_target;
  const distance = metric.display.gap_to_target;
  const sources = ["current", "target", "limit"].map((p) => (metric[p] || {}).evidence).filter(Boolean);
  return h`<article class="card metric-card">
    <h3><span>${def.name}${metric.headline ? h` <span class="chip" title="The metric shown for this technology in summaries">headline</span>` : ""}</span>
      ${distance ? h`<span class="distance ${size <= 0 ? "met" : ""}">${distance === "met" ? "target met" : `${distance} to go`}</span>` : ""}</h3>
    <div class="small muted">${def.meaning ? `${def.meaning.replace(/\.?$/, ".")} ` : ""}${def.direction ? `${def.direction === "lower" ? "Lower" : "Higher"} is better.` : ""}</div>
    ${ladder(metric, def)}
    <div class="metric-values">
      <div><span>Current${metric.current && metric.current.as_of ? ` (${metric.current.as_of})` : ""}</span><b>${metric.display.current || "–"}</b></div>
      <div><span>Target</span><b>${metric.display.target || "–"}</b></div>
      <div><span>Limit</span><b>${metric.display.limit || "–"}</b></div>
    </div>
    ${metric.conditions ? h`<div class="rationale"><b>Conditions.</b> ${oneLine(metric.conditions)}</div>` : ""}
    ${metric.target && metric.target.rationale ? h`<div class="rationale"><b>Why this target.</b> ${oneLine(metric.target.rationale)}</div>` : ""}
    ${metric.limit && metric.limit.basis ? h`<div class="rationale"><b>Limit.</b> ${oneLine(metric.limit.basis)}${metric.display.target_to_limit ? h` Target to limit: ${metric.display.target_to_limit}.` : ""}</div>` : ""}
    ${metric.current && metric.current.note ? h`<div class="rationale"><b>Note.</b> ${oneLine(metric.current.note)}</div>` : ""}
    ${evidenceLinks(sources)}
  </article>`;
}

function ladder(metric, def) {
  const log = def.scale === "log";
  const lower = def.direction === "lower";
  const points = [
    ["now", (metric.current || {}).value],
    ["target", (metric.target || {}).value],
    ["limit", (metric.limit || {}).value],
  ].filter(([, v]) => typeof v === "number" && (!log || v > 0));
  if (!points.length) return "";
  const f = (v) => (log ? Math.log10(v) : v);
  let min = Math.min(...points.map(([, v]) => f(v)));
  let max = Math.max(...points.map(([, v]) => f(v)));
  if (max - min < 1e-9) {
    const spread = log ? 1 : Math.abs(min) * 0.2 || 1;
    min -= spread;
    max += spread;
  }
  const pad = (max - min) * 0.1;
  min -= pad;
  max += pad;
  const L = 12, R = 348, Y = 34;
  const x = (v) => {
    let t = (f(v) - min) / (max - min);
    if (lower) t = 1 - t;
    return L + t * (R - L);
  };
  const byName = Object.fromEntries(points);
  const ticks = [];
  if (log && max - min <= 40) {
    const step = max - min > 16 ? 2 : 1;
    for (let e = Math.ceil(min); e <= Math.floor(max); e += step) ticks.push(x(10 ** e));
  } else if (!log) {
    const span = max - min;
    const step = span > 60 ? 20 : span > 20 ? 10 : span > 5 ? 1 : span / 5;
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(x(v));
  }
  const met = metric.gap_to_target !== null && metric.gap_to_target !== undefined && metric.gap_to_target <= 0;
  const accent = met ? "var(--ok)" : "var(--accent)";
  const anchor = (px) => (px < 40 ? "start" : px > 320 ? "end" : "middle");
  let svg = `<line x1="${L}" y1="${Y}" x2="${R}" y2="${Y}" stroke="var(--border-strong)" stroke-width="2" stroke-linecap="round"/>`;
  svg += ticks.map((t) => `<line x1="${t.toFixed(1)}" y1="${Y - 4}" x2="${t.toFixed(1)}" y2="${Y + 4}" stroke="var(--border-strong)" stroke-width="1"/>`).join("");
  if ("now" in byName && "target" in byName) {
    svg += `<line x1="${x(byName.now).toFixed(1)}" y1="${Y}" x2="${x(byName.target).toFixed(1)}" y2="${Y}" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>`;
  }
  if ("target" in byName && "limit" in byName) {
    svg += `<line x1="${x(byName.target).toFixed(1)}" y1="${Y}" x2="${x(byName.limit).toFixed(1)}" y2="${Y}" stroke="var(--faint)" stroke-width="2" stroke-dasharray="4 4"/>`;
  }
  if ("limit" in byName) {
    const px = x(byName.limit);
    svg += `<line x1="${px.toFixed(1)}" y1="${Y - 10}" x2="${px.toFixed(1)}" y2="${Y + 10}" stroke="var(--text)" stroke-width="2"/>`;
    const near = "target" in byName && Math.abs(px - x(byName.target)) < 50;
    svg += `<text x="${px.toFixed(1)}" y="${near ? Y + 26 : Y - 16}" text-anchor="${anchor(px)}">limit</text>`;
  }
  if ("target" in byName) {
    const px = x(byName.target);
    svg += `<rect x="${(px - 6).toFixed(1)}" y="${Y - 6}" width="12" height="12" transform="rotate(45 ${px.toFixed(1)} ${Y})" fill="var(--surface)" stroke="${accent}" stroke-width="2.5"/>`;
    svg += `<text class="val" x="${px.toFixed(1)}" y="${Y - 16}" text-anchor="${anchor(px)}">target</text>`;
  }
  if ("now" in byName) {
    const px = x(byName.now);
    svg += `<circle cx="${px.toFixed(1)}" cy="${Y}" r="6.5" fill="var(--text)" stroke="var(--surface)" stroke-width="2"/>`;
    svg += `<text class="val" x="${px.toFixed(1)}" y="${Y + 26}" text-anchor="${anchor(px)}">now</text>`;
  }
  const label = `${def.name}: ${log ? "log scale, one tick per order of magnitude" : "linear scale"}; better to the right`;
  return new Raw(`<svg class="ladder" viewBox="0 0 360 64" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${svg}</svg>`);
}

function gapCard(gap, tech, showOwner) {
  return h`<article class="card gap-card sev-${gap.severity}" id="gap-${gap.id}">
    <div class="card-title"><h3>${gap.title}</h3></div>
    ${showOwner ? h`<div class="owner"><span class="domain-swatch" style="--d:${domainColor(tech.domain)}"></span> <a href="#/tech/${tech.id}">${tech.name}</a></div>` : ""}
    <div class="chips">
      ${severityChip(gap.severity)}
      ${plainChip(gap.type.replace(/-/g, " "), meaning("gap_type", gap.type))}
      ${plainChip(`layer: ${gap.layer}`, meaning("layer", gap.layer))}
      ${plainChip(gap.status, meaning("gap_status", gap.status))}
    </div>
    ${paragraphs(gap.description)}
    ${gap.blocked_by && gap.blocked_by.length ? h`<p class="small"><b>Held open by:</b> ${gap.blocked_by.map((id, i) => h`${i ? ", " : ""}${techLink(id)}`)}</p>` : ""}
    ${gap.approach && gap.approach.length ? h`<p class="small" style="margin-bottom:0"><b>Approaches</b></p><ul class="approaches">${gap.approach.map((a) => h`<li>${a.name}${a.readiness ? h` <span class="muted">(${levelName(tech, a.readiness)})</span>` : ""} ${a.evidence && a.evidence.length ? a.evidence.map((k) => h` <a class="mono small" href="#/evidence/${k}">${k}</a>`) : ""}</li>`)}</ul>` : ""}
    ${evidenceLinks(gap.evidence)}
  </article>`;
}

/* ---------- Graph ---------- */

function graphColors() {
  return {
    text: cssVar("--text"),
    muted: cssVar("--muted"),
    surface: cssVar("--surface"),
    edge: cssVar("--border-strong"),
    accent: cssVar("--accent"),
  };
}

function graphStyle() {
  const c = graphColors();
  return [
    { selector: "node", style: {
      "background-color": "data(color)", label: "data(label)", color: c.text,
      "font-family": '"Source Sans 3", "Source Sans Pro", sans-serif', "font-size": 12, "text-wrap": "wrap", "text-max-width": 120,
      "text-valign": "bottom", "text-margin-y": 4,
      "border-width": 2, "border-color": c.surface, "text-outline-color": c.surface, "text-outline-width": 2, "text-outline-opacity": 0.85,
    } },
    { selector: "node[weight]", style: { width: "mapData(weight, 0, 5, 16, 34)", height: "mapData(weight, 0, 5, 16, 34)" } },
    { selector: 'node[status = "proposed"]', style: { "background-opacity": 0.3, "border-style": "dashed", "border-color": "data(color)" } },
    { selector: "node[?focus]", style: { "border-width": 4, "border-color": c.text, "font-weight": 700 } },
    { selector: "node[?isDomain]", style: {
      shape: "round-rectangle", "background-color": "data(color)", "background-opacity": 0.07, "border-width": 1,
      "border-style": "solid", "border-color": "data(color)", "border-opacity": 0.6, label: "data(label)", "text-valign": "top",
      "text-halign": "center", "text-margin-y": -4, "font-size": 12, "font-weight": 600, color: c.muted, padding: 12,
    } },
    { selector: "edge", style: {
      width: 1.6, "line-color": c.edge, "target-arrow-color": c.edge, "target-arrow-shape": "triangle", "curve-style": "bezier", "arrow-scale": 0.9,
    } },
    { selector: "node:selected", style: { "border-width": 4, "border-color": c.accent } },
    { selector: ".faded", style: { opacity: 0.15 } },
    { selector: ".hidden", style: { display: "none" } },
  ];
}

function buildGraph(container, ids, options) {
  if (!window.cytoscape) {
    container.innerHTML = '<p class="empty" style="padding:16px">The graph library did not load.</p>';
    return null;
  }
  const set = new Set(ids);
  const elements = [];
  if (options.group) {
    [...new Set(ids.map((id) => state.techs.get(id).domain))].forEach((d) => {
      elements.push({ data: { id: `domain:${d}`, label: (state.domains.get(d) || {}).name || d, color: domainColor(d), isDomain: true } });
    });
  }
  ids.forEach((id) => {
    const tech = state.techs.get(id);
    const node = {
      id, label: tech.name, color: domainColor(tech.domain), status: tech.status,
      weight: tech.requires.length + tech.required_by.length, focus: id === options.focus,
    };
    if (options.group) node.parent = `domain:${tech.domain}`;
    elements.push({ data: node });
  });
  ids.forEach((id) => {
    state.techs.get(id).requires.forEach((r) => {
      if (set.has(r.technology)) elements.push({ data: { id: `${id}->${r.technology}`, source: id, target: r.technology } });
    });
  });
  let layout;
  if (options.layout === "tree") {
    layout = { name: "breadthfirst", directed: true, padding: 24, spacingFactor: 1.05, animate: false,
      roots: ids.filter((id) => !state.techs.get(id).required_by.some((r) => set.has(r.technology))) };
  } else if (options.group) {
    layout = { name: "preset", positions: domainGridPositions(ids, container.clientWidth, container.clientHeight), padding: 24, fit: true };
  } else {
    layout = { name: "cose", animate: false, padding: 24, randomize: true, nodeRepulsion: () => 6000,
      idealEdgeLength: () => 60, gravity: 0.8, componentSpacing: 40, nodeOverlap: 16, numIter: 2000 };
  }
  const cy = cytoscape({
    container, elements, style: graphStyle(), layout, minZoom: 0.1, maxZoom: 3,
    boxSelectionEnabled: false, autoungrabify: false,
  });
  cy.on("tap", "node", (event) => {
    const node = event.target;
    if (node.data("isDomain")) return;
    if (options.onSelect) options.onSelect(node.id());
    else location.hash = `#/tech/${node.id()}`;
  });
  if (options.onClear) cy.on("tap", (event) => { if (event.target === cy) options.onClear(); });
  return cy;
}

/* Domains as boxes packed into columns, each box a stack of its technologies. Deterministic, so the
   picture is the same on every visit; a force layout with compound nodes scattered them. */
function domainGridPositions(ids, width, height) {
  const byDomain = new Map();
  ids.forEach((id) => {
    const domain = state.techs.get(id).domain;
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain).push(id);
  });
  const order = [...state.domains.keys()].filter((d) => byDomain.has(d));
  const blockHeight = (domain) => byDomain.get(domain).length * 64 + 76;
  // Largest domains first into the shortest column balances the heights; each column then lists
  // its domains in taxonomy order. The column count is the one that fits the box at the largest zoom.
  const pack = (columns) => {
    const heights = new Array(columns).fill(0);
    const assigned = Array.from({ length: columns }, () => []);
    [...order].sort((a, b) => blockHeight(b) - blockHeight(a)).forEach((domain) => {
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
  const positions = {};
  best.assigned.forEach((domains, column) => {
    let y = 0;
    domains.sort((a, b) => order.indexOf(a) - order.indexOf(b)).forEach((domain) => {
      byDomain.get(domain).forEach((id, k) => { positions[id] = { x: column * 190, y: y + k * 64 }; });
      y += blockHeight(domain);
    });
  });
  return positions;
}

function graphView() {
  setTitle("Graph");
  const domains = [...state.domains.values()];
  const html = h`
    <h1>The dependency graph</h1>
    <p class="muted">Every technology in the atlas. An arrow goes from a technology to one it requires; a shared
    dependency shows up once, however many domains wait on it. Dashed nodes are proposed and not yet mapped.</p>
    <div class="graph-layout">
      <div class="graph-box graph-full" id="graph" aria-label="Dependency graph of every technology"></div>
      <aside class="graph-side">
        <div class="card" id="graph-panel"><p class="muted small" style="margin:0">Select a technology to see what it requires and what waits on it.</p></div>
        <div class="card">
          <label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="opt-group" checked> Group by domain</label>
          <label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="opt-proposed" checked> Show proposed</label>
          <label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="opt-isolated" checked> Show technologies without links</label>
        </div>
        <div class="card">
          <div class="small muted" style="margin-bottom:6px">Domains (select to hide)</div>
          <div class="legend">${domains.map((d) => h`<button type="button" data-domain="${d.id}"><span class="domain-swatch" style="--d:${domainColor(d.id)}"></span>${d.name}</button>`)}</div>
        </div>
      </aside>
    </div>`;

  return {
    html,
    after(root) {
      const container = root.querySelector("#graph");
      const panel = root.querySelector("#graph-panel");
      const hidden = new Set();
      let cy = null;

      const showPanel = (id) => {
        const tech = state.techs.get(id);
        const m = headline(tech);
        panel.innerHTML = part(h`
          <div class="small muted"><span class="domain-swatch" style="--d:${domainColor(tech.domain)}"></span> ${(state.domains.get(tech.domain) || {}).name}</div>
          <h3 style="margin:4px 0 6px"><a href="#/tech/${tech.id}">${tech.name}</a></h3>
          <div class="chips">${statusChip(tech.status)}${tech.worst_open_severity ? severityChip(tech.worst_open_severity) : ""}</div>
          <p class="small">${firstSentence(tech.statement)}</p>
          ${m && m.display.gap_to_target ? h`<p class="small"><b>${(state.metrics.get(m.metric) || {}).name}</b>: ${m.display.gap_to_target} to target</p>` : ""}
          <p class="small" style="margin-bottom:4px"><b>Requires:</b> ${tech.requires.length ? tech.requires.map((r, i) => h`${i ? ", " : ""}${techLink(r.technology)}`) : "nothing recorded"}</p>
          <p class="small" style="margin-bottom:8px"><b>Required by:</b> ${tech.required_by.length ? tech.required_by.map((r, i) => h`${i ? ", " : ""}${techLink(r.technology)}`) : "nothing yet"}</p>
          <a href="#/tech/${tech.id}">Open the technology</a>`);
        cy.elements().addClass("faded");
        const node = cy.getElementById(id);
        node.closedNeighborhood().removeClass("faded");
        node.ancestors().removeClass("faded");
        node.closedNeighborhood().nodes().ancestors().removeClass("faded");
      };
      const clearPanel = () => {
        panel.innerHTML = '<p class="muted small" style="margin:0">Select a technology to see what it requires and what waits on it.</p>';
        if (cy) cy.elements().removeClass("faded");
      };

      const draw = () => {
        if (cy) { cy.destroy(); state.graphs = state.graphs.filter((g) => g !== cy); }
        const showProposed = root.querySelector("#opt-proposed").checked;
        const showIsolated = root.querySelector("#opt-isolated").checked;
        const ids = state.data.technologies
          .filter((t) => !hidden.has(t.domain))
          .filter((t) => showProposed || t.status !== "proposed")
          .filter((t) => showIsolated || t.requires.length || t.required_by.length)
          .map((t) => t.id);
        clearPanel();
        cy = buildGraph(container, ids, { group: root.querySelector("#opt-group").checked, onSelect: showPanel, onClear: clearPanel });
        if (cy) state.graphs.push(cy);
      };

      root.querySelectorAll(".legend button").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.dataset.domain;
          if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
          button.classList.toggle("off", hidden.has(id));
          draw();
        });
      });
      root.querySelectorAll("#opt-group, #opt-proposed, #opt-isolated").forEach((input) => input.addEventListener("change", draw));
      draw();
    },
  };
}

/* ---------- Gaps ---------- */

const GAP_FILTERS = [
  ["domain", "Domain"],
  ["severity", "Severity"],
  ["type", "Type"],
  ["layer", "Layer"],
  ["status", "Status"],
];

function gapsView(params) {
  setTitle("Gaps");
  const all = state.data.technologies.flatMap((t) => t.gaps.map((g) => ({ gap: g, tech: t })));
  const options = {
    domain: [...state.domains.values()].filter((d) => all.some((r) => r.tech.domain === d.id)).map((d) => [d.id, d.name]),
    severity: SEVERITIES.map((s) => [s, s]),
    type: Object.keys(state.vocab.gap_type || {}).map((s) => [s, s.replace(/-/g, " ")]),
    layer: Object.keys(state.vocab.layer || {}).map((s) => [s, s]),
    status: Object.keys(state.vocab.gap_status || {}).map((s) => [s, s]),
  };
  const html = h`
    <h1>Gaps</h1>
    <p class="muted">What stands between each technology and its target, classified by type, layer and severity.
    A gap held open by another technology points to it.</p>
    <form class="filters" id="gap-filters" onsubmit="return false">
      ${GAP_FILTERS.map(([key, label]) => h`<label>${label}<select name="${key}"><option value="">All</option>
        ${options[key].map(([value, text]) => h`<option value="${value}" ${params.get(key) === value ? new Raw("selected") : ""}>${text}</option>`)}</select></label>`)}
      <label>Search<input type="search" name="q" value="${params.get("q") || ""}" placeholder="Words in the title or description"></label>
      <button type="button" class="reset">Clear</button>
    </form>
    <div class="count" id="gap-count"></div>
    <div class="stack" id="gap-list"></div>`;

  return {
    html,
    keepScroll: false,
    after(root) {
      const form = root.querySelector("#gap-filters");
      const update = () => {
        const values = Object.fromEntries(new FormData(form).entries());
        const q = (values.q || "").trim().toLowerCase();
        const rows = all.filter(({ gap, tech }) =>
          (!values.domain || tech.domain === values.domain) &&
          (!values.severity || gap.severity === values.severity) &&
          (!values.type || gap.type === values.type) &&
          (!values.layer || gap.layer === values.layer) &&
          (!values.status || gap.status === values.status) &&
          (!q || `${gap.title} ${gap.description} ${tech.name}`.toLowerCase().includes(q)));
        rows.sort((a, b) => SEVERITIES.indexOf(a.gap.severity) - SEVERITIES.indexOf(b.gap.severity) || a.tech.name.localeCompare(b.tech.name));
        root.querySelector("#gap-count").textContent = `${rows.length} of ${all.length} gaps`;
        root.querySelector("#gap-list").innerHTML = rows.length ? part(rows.map(({ gap, tech }) => gapCard(gap, tech, true))) : '<p class="empty">No gap matches these filters.</p>';
        const query = new URLSearchParams(Object.entries(values).filter(([, v]) => v)).toString();
        history.replaceState(null, "", `#/gaps${query ? `?${query}` : ""}`);
      };
      form.addEventListener("input", update);
      form.addEventListener("change", update);
      form.querySelector(".reset").addEventListener("click", () => { form.reset(); form.querySelectorAll("select").forEach((s) => { s.value = ""; }); form.q.value = ""; update(); });
      update();
    },
  };
}

/* ---------- Evidence ---------- */

function authorsShort(card) {
  const authors = card.authors || [];
  if (!authors.length) return "";
  return authors.length > 2 ? `${authors[0]} et al.` : authors.join(" and ");
}

function cardRow(card) {
  return h`<article class="card">
    <div class="card-title"><h3 style="font-size:1rem"><a href="#/evidence/${card.key}">${card.title}</a></h3>
      <span class="mono small muted">${card.key}</span></div>
    <div class="small muted">${authorsShort(card)} &middot; ${card.venue || ""} &middot; ${card.year || ""}</div>
    <div class="chips" style="margin-bottom:0">
      ${plainChip(card.class, meaning("evidence_class", card.class))}
      ${plainChip(card.status, meaning("evidence_status", card.status))}
      ${plainChip(card.type, meaning("evidence_type", card.type))}
      ${card.cited_by.length ? plainChip(`cited by ${card.cited_by.length}`) : plainChip("not cited")}
    </div>
  </article>`;
}

function evidenceView(params) {
  setTitle("Evidence");
  const cards = state.data.evidence;
  const select = (name, label, values) => h`<label>${label}<select name="${name}"><option value="">All</option>
    ${values.map((v) => h`<option value="${v}" ${params.get(name) === v ? new Raw("selected") : ""}>${v}</option>`)}</select></label>`;
  const html = h`
    <h1>Evidence</h1>
    <p class="muted">Every number in the atlas comes from a card: the source, a verbatim quote, the conditions and a
    class. Agents add cards as unverified or machine-checked; only a curator marks a card verified.</p>
    <form class="filters" id="card-filters" onsubmit="return false">
      ${select("class", "Class", Object.keys(state.vocab.evidence_class || {}))}
      ${select("status", "Status", Object.keys(state.vocab.evidence_status || {}))}
      ${select("type", "Type", Object.keys(state.vocab.evidence_type || {}))}
      <label>Search<input type="search" name="q" value="${params.get("q") || ""}" placeholder="Title, author, venue or key"></label>
      <button type="button" class="reset">Clear</button>
    </form>
    <div class="count" id="card-count"></div>
    <div class="stack" id="card-list"></div>`;
  return {
    html,
    after(root) {
      const form = root.querySelector("#card-filters");
      const update = () => {
        const values = Object.fromEntries(new FormData(form).entries());
        const q = (values.q || "").trim().toLowerCase();
        const rows = cards.filter((c) =>
          (!values.class || c.class === values.class) &&
          (!values.status || c.status === values.status) &&
          (!values.type || c.type === values.type) &&
          (!q || `${c.key} ${c.title} ${(c.authors || []).join(" ")} ${c.venue}`.toLowerCase().includes(q)))
          .sort((a, b) => (b.year || 0) - (a.year || 0) || a.key.localeCompare(b.key));
        root.querySelector("#card-count").textContent = `${rows.length} of ${cards.length} cards`;
        root.querySelector("#card-list").innerHTML = rows.length ? part(rows.map(cardRow)) : '<p class="empty">No card matches these filters.</p>';
        const query = new URLSearchParams(Object.entries(values).filter(([, v]) => v)).toString();
        history.replaceState(null, "", `#/evidence${query ? `?${query}` : ""}`);
      };
      form.addEventListener("input", update);
      form.addEventListener("change", update);
      form.querySelector(".reset").addEventListener("click", () => { form.querySelectorAll("select").forEach((s) => { s.value = ""; }); form.q.value = ""; update(); });
      update();
    },
  };
}

function cardView(key) {
  const card = state.cards.get(key);
  if (!card) return notFound();
  setTitle(card.title);
  return { html: h`
    <p class="eyebrow"><a href="#/evidence">Evidence</a> / <span class="mono">${card.key}</span></p>
    <h1>${card.title}</h1>
    <p class="muted">${(card.authors || []).join(", ")}<br>${card.venue || ""}${card.year ? `, ${card.year}` : ""}</p>
    <div class="chips">
      ${plainChip(card.class, meaning("evidence_class", card.class))}
      ${plainChip(card.status, meaning("evidence_status", card.status))}
      ${plainChip(card.type, meaning("evidence_type", card.type))}
    </div>
    ${card.link ? h`<p><a href="${card.link}">Read the source</a>${card.doi ? h` <span class="mono small muted">doi:${card.doi}</span>` : ""}</p>` : ""}
    ${card.note ? h`<p class="notice">${oneLine(card.note)}</p>` : ""}

    <h2>Findings</h2>
    <div class="card">${(card.finding || []).map((f) => h`<div class="finding">
      ${f.metric ? h`<div><b>${(state.metrics.get(f.metric) || {}).name || f.metric}</b>: ${fmtValue(f.value, f.unit)}</div>` : ""}
      ${f.conditions ? h`<div class="small muted">${oneLine(f.conditions)}</div>` : ""}
      ${f.quote ? h`<blockquote>${oneLine(f.quote)}</blockquote>` : ""}
    </div>`)}</div>

    <h2>Cited by</h2>
    ${card.cited_by.length ? h`<ul>${card.cited_by.map((id) => h`<li>${techLink(id)}</li>`)}</ul>` : h`<p class="empty">No technology cites this card yet.</p>`}

    <p class="small muted" style="margin-top:2rem">
      Added ${card.added || "?"} by ${card.added_by || "?"}${card.checked ? `, checked ${card.checked}` : ""} &middot;
      <a href="${card.source}">Source TOML</a> &middot; <a href="${state.data.repository}/issues/new/choose">Report a problem</a>
    </p>` };
}

/* ---------- About ---------- */

function aboutView() {
  setTitle("About");
  const data = state.data;
  return { html: h`
    <div class="prose">
      <h1>About the atlas</h1>
      <p class="lede">Escape velocity is the speed at which a rocket stops falling back. A technology has one too: the
      point where it works well enough, cheaply enough and reliably enough to carry on by itself.</p>
      <h2>The model</h2>
      <ul>
        <li><b>A technology</b> is a capability with a measurable target, a statement and a scope.</li>
        <li><b>Each metric</b> has three numbers: the best value demonstrated so far, the target with its rationale, and the physical limit where one exists.</li>
        <li><b>Gaps</b> are classified by type, layer and severity. A gap held open by another technology points to it.</li>
        <li><b>Evidence cards</b> carry every number: the source, a verbatim quote, the conditions and a class (established, reported, extrapolation, speculation).</li>
      </ul>
      <p>The full model is in <a href="${data.repository}/blob/main/docs/model.md">docs/model.md</a>.</p>
      <h2>Use the data</h2>
      <ul>
        <li><a href="atlas.json">atlas.json</a>: the whole atlas in one file, with gap sizes, dependents and citations (<a href="${data.repository}/blob/main/docs/export.md">format</a>).</li>
        <li><a href="llms.txt">llms.txt</a> and <a href="llms-full.txt">llms-full.txt</a>: the atlas for language models.</li>
        <li>An MCP server for agents, in <a href="${data.repository}/blob/main/tools/mcp_server.py">tools/mcp_server.py</a>: technologies, gaps, dependencies, bottlenecks, evidence and literature search.</li>
      </ul>
      <h2>Cite</h2>
      <p>Cite the atlas version you used: this page shows version <a href="${data.repository}/commit/${data.version}"><code>${data.version}</code></a>
      (${data.version_date}). The citation metadata is in <a href="${data.repository}/blob/main/CITATION.cff">CITATION.cff</a>.
      Data is under CC0 1.0, text under CC BY 4.0 and code under Apache 2.0.</p>
      <h2>Contribute</h2>
      <p>One sourced number is a real contribution. Every change, from a person or an agent, is a pull request reviewed
      by a person. See <a href="${data.repository}/blob/main/CONTRIBUTING.md">CONTRIBUTING.md</a>.</p>
      <h2>The Alan Machine</h2>
      <p><a href="${data.alan_machine}">The Alan Machine</a> is an open-source book about a hypothetical supercomputer at the
      physical limits of computation. The atlas shares its metrics and its kinds of claim, and links each technology
      to the pages that discuss it.</p>
      <p class="small muted">Out of scope: weapons, dual-use research of concern, surveillance aimed at people, investment
      advice and medical advice.</p>
    </div>` };
}

/* ---------- Theme ---------- */

function storedTheme() {
  try { return localStorage.getItem("ev-theme"); } catch (error) { return null; }
}

function applyTheme(theme) {
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}

function effectiveTheme() {
  const set = document.documentElement.dataset.theme;
  if (set) return set;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setupTheme() {
  applyTheme(storedTheme());
  document.querySelector(".theme-toggle").addEventListener("click", () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("ev-theme", next); } catch (error) { /* private mode: keep it for this visit */ }
    state.graphs.forEach((cy) => cy.style(graphStyle()));
    if (parseHash().parts.length === 0) route();
  });
}

/* ---------- Start ---------- */

async function start() {
  setupTheme();
  const main = document.getElementById("main");
  try {
    const response = await fetch("atlas.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
  } catch (error) {
    main.innerHTML = part(h`<h1>The atlas did not load</h1><p>atlas.json could not be read (${error.message}). Build it with <code>python3 tools/build_site.py</code>.</p>`);
    return;
  }
  const data = state.data;
  data.technologies.forEach((t) => state.techs.set(t.id, t));
  data.evidence.forEach((c) => state.cards.set(c.key, c));
  data.taxonomy.domains.forEach((d) => state.domains.set(d.id, d));
  data.taxonomy.metrics.forEach((m) => state.metrics.set(m.id, m));
  data.taxonomy.readiness_scales.forEach((s) => state.scales.set(s.id, s));
  state.vocab = Object.fromEntries(Object.entries(data.taxonomy.vocabulary).map(([field, items]) => [field, Object.fromEntries(items.map((i) => [i.id, i.meaning]))]));
  document.getElementById("footer-version").innerHTML = part(h`Atlas version <a href="${data.repository}/commit/${data.version}"><code>${data.version}</code></a>, ${data.version_date}. Every number links to its source.`);
  window.addEventListener("hashchange", route);
  route();
}

start();
