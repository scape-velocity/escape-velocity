/* The repeated blocks of the views of site/app.js: barChart, domainCard, metricCard, gapCard,
   cardRow and the side panel of the graph. Server components, in the language of their atlas. */

import Link from "next/link";
import type { CSSProperties } from "react";

import { fill, plural } from "@/i18n";
import { domainColor } from "@/lib/colors";
import { authorsShort, firstSentence, oneLine } from "@/lib/format";
import { headline, openGaps, type Atlas } from "@/lib/model";
import { cardPath, domainPath, techPath } from "@/lib/paths";
import type { EvidenceCard, Gap, Metric, Technology } from "@/lib/types";

import { Ladder } from "./Ladder";
import { EvidenceLinks, Paragraphs, PlainChip, SeverityChip, StatusChip, Swatch, TechLinks } from "./ui";

export interface BarRow {
  tech: Technology;
  metric: Metric;
}

/** Distances to target as bars: in orders of magnitude when `log`, else in percentage points. */
export function BarChart({ atlas, rows, max, log }: { atlas: Atlas; rows: BarRow[]; max: number; log: boolean }) {
  const t = atlas.t.bars;
  const ticks = log
      ? Array.from({ length: Math.min(max, 12) + 1 }, (_, i) => Math.round((i * max) / Math.min(max, 12)))
      : [0, 25, 50, 75, 100];
  return (
    <div className="bars">
      {rows.map(({ tech, metric }) => {
        const def = atlas.metrics.get(metric.metric);
        const size = metric.gap_to_target as number;
        const met = size <= 0;
        const width = met ? 100 : Math.max(1.5, Math.min(100, (size / max) * 100));
        return (
          <div className="bar-row" key={tech.id}>
            <div className="bar-label">
              <Link href={techPath(tech.id, undefined, atlas.lang)}>{tech.name}</Link>{" "}
              <span className="muted">
                {fill(t.label, {
                  metric: def?.name ?? metric.metric,
                  current: metric.display.current ?? "",
                  target: metric.display.target ?? "",
                })}
              </span>
            </div>
            <div
              className="bar-track"
              role="img"
              aria-label={fill(t.aria, { tech: tech.name, distance: metric.display.gap_to_target ?? "" })}
            >
              <div
                className="bar-fill"
                style={{ width: `${width.toFixed(1)}%`, "--d": met ? "var(--ok)" : domainColor(tech.domain) } as CSSProperties}
              />
              <span className="bar-text">{metric.display.gap_to_target}</span>
            </div>
          </div>
        );
      })}
      <div className="bar-ticks">
        <div />
        <div>
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DomainCard({ atlas, domainId }: { atlas: Atlas; domainId: string }) {
  const domain = atlas.domains.get(domainId);
  if (!domain) return null;
  const techs = atlas.techsOf(domain.id);
  const gaps = techs.reduce((n, t) => n + openGaps(t).length, 0);
  const t = atlas.t.domainCard;
  return (
    <article className="card domain-card">
      <h3>
        <Swatch domain={domain.id} />
        <Link href={domainPath(domain.id, atlas.lang)}>{domain.name}</Link>
      </h3>
      <p>{domain.summary}</p>
      <p className="small muted">
        {plural(t.techs, techs.length)} &middot; {plural(t.openGaps, gaps)}
      </p>
      <ul className="tech-list">
        {techs.map((tech) => {
          const m = headline(tech);
          const distance = m?.display.gap_to_target;
          const met = m?.gap_to_target !== null && m?.gap_to_target !== undefined && m.gap_to_target <= 0;
          const note = distance ? (met ? t.met : fill(t.toGo, { distance: distance.replace(t.ordersLong, t.ordersShort) })) : "";
          return (
            <li key={tech.id}>
              <Link href={techPath(tech.id, undefined, atlas.lang)}>
                <span className={`status-dot status-${tech.status}`} title={atlas.label("technology_status", tech.status)} />
                {tech.name}
              </Link>
              <span className="gap-note">{note}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export function MetricCard({ atlas, metric }: { atlas: Atlas; metric: Metric }) {
  const def = atlas.metrics.get(metric.metric) ?? { name: metric.metric, unit: "" };
  const size = metric.gap_to_target;
  const distance = metric.display.gap_to_target;
  const t = atlas.t.metric;
  const sources = [metric.current?.evidence, metric.target?.evidence, metric.limit?.evidence].filter(
    (k): k is string => Boolean(k),
  );
  const meaning = "meaning" in def && def.meaning ? `${def.meaning.replace(/\.?$/, ".")} ` : "";
  const direction = "direction" in def && def.direction ? (def.direction === "lower" ? t.lower : t.higher) : "";
  return (
    <article className="card metric-card">
      <h3>
        <span>
          {def.name}
          {metric.headline ? (
            <>
              {" "}
              <span className="chip" title={t.headlineTitle}>
                {t.headline}
              </span>
            </>
          ) : null}
        </span>
        {distance ? (
          <span className={`distance ${size !== null && size <= 0 ? "met" : ""}`}>
            {size !== null && size <= 0 ? t.targetMet : fill(t.toGo, { distance })}
          </span>
        ) : null}
      </h3>
      <div className="small muted">
        {meaning}
        {direction}
      </div>
      <Ladder metric={metric} def={def} t={atlas.t.ladder} />
      <div className="metric-values">
        <div>
          <span>
            {t.current}
            {metric.current?.as_of ? ` (${metric.current.as_of})` : ""}</span>
          <b>{metric.display.current || "–"}</b>
        </div>
        <div>
          <span>{t.target}</span>
          <b>{metric.display.target || "–"}</b>
        </div>
        <div>
          <span>{t.limit}</span>
          <b>{metric.display.limit || "–"}</b>
        </div>
      </div>
      {metric.conditions ? (
        <div className="rationale">
          <b>{t.conditions}</b> {oneLine(metric.conditions)}
        </div>
      ) : null}
      {metric.target?.rationale ? (
        <div className="rationale">
          <b>{t.whyTarget}</b> {oneLine(metric.target.rationale)}
        </div>
      ) : null}
      {metric.limit?.basis ? (
        <div className="rationale">
          <b>{t.limitBasis}</b> {oneLine(metric.limit.basis)}
          {metric.display.target_to_limit ? ` ${fill(t.targetToLimit, { distance: metric.display.target_to_limit })}` : ""}
        </div>
      ) : null}
      {metric.current?.note ? (
        <div className="rationale">
          <b>{t.note}</b> {oneLine(metric.current.note)}
        </div>
      ) : null}
      <EvidenceLinks atlas={atlas} keys={sources} />
    </article>
  );
}

export function GapCard({ atlas, gap, tech, showOwner }: { atlas: Atlas; gap: Gap; tech: Technology; showOwner: boolean }) {
  const t = atlas.t.gap;
  return (
    <article className={`card gap-card sev-${gap.severity}`} id={`gap-${gap.id}`}>
      <div className="card-title">
        <h3>{gap.title}</h3>
      </div>
      {showOwner ? (
        <div className="owner">
          <Swatch domain={tech.domain} /> <Link href={techPath(tech.id, undefined, atlas.lang)}>{tech.name}</Link>
        </div>
      ) : null}
      <div className="chips">
        <SeverityChip atlas={atlas} severity={gap.severity} />
        <PlainChip text={atlas.label("gap_type", gap.type)} title={atlas.meaning("gap_type", gap.type)} />
        <PlainChip text={fill(t.layer, { layer: atlas.label("layer", gap.layer) })} title={atlas.meaning("layer", gap.layer)} />
        <PlainChip text={atlas.label("gap_status", gap.status)} title={atlas.meaning("gap_status", gap.status)} />
      </div>
      <Paragraphs text={gap.description} />
      {gap.blocked_by && gap.blocked_by.length ? (
        <p className="small">
          <b>{t.heldOpenBy}</b> <TechLinks atlas={atlas} ids={gap.blocked_by} />
        </p>
      ) : null}
      {gap.approach && gap.approach.length ? (
        <>
          <p className="small" style={{ marginBottom: 0 }}>
            <b>{t.approaches}</b>
          </p>
          <ul className="approaches">
            {gap.approach.map((a, i) => (
              <li key={i}>
                {a.name}
                {a.readiness ? (
                  <>
                    {" "}
                    <span className="muted">({atlas.levelName(tech, a.readiness)})</span>
                  </>
                ) : null}{" "}
                {(a.evidence ?? []).map((k) => (
                  <span key={k}>
                    {" "}
                    <Link className="mono small" href={cardPath(k, atlas.lang)}>
                      {k}
                    </Link>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <EvidenceLinks atlas={atlas} keys={gap.evidence} />
    </article>
  );
}

/** The class, status and type of an evidence card, with their meanings as titles. */
export function EvidenceChips({ atlas, card }: { atlas: Atlas; card: EvidenceCard }) {
  return (
    <>
      <PlainChip text={atlas.label("evidence_class", card.class)} title={atlas.meaning("evidence_class", card.class)} />
      <PlainChip text={atlas.label("evidence_status", card.status)} title={atlas.meaning("evidence_status", card.status)} />
      <PlainChip text={atlas.label("evidence_type", card.type)} title={atlas.meaning("evidence_type", card.type)} />
    </>
  );
}

export function CardRow({ atlas, card }: { atlas: Atlas; card: EvidenceCard }) {
  return (
    <article className="card">
      <div className="card-title">
        <h3 style={{ fontSize: "1rem" }}>
          <Link href={cardPath(card.key, atlas.lang)}>{card.title}</Link>
        </h3>
        <span className="mono small muted">{card.key}</span>
      </div>
      <div className="small muted">
        {authorsShort(card, atlas.lang)} &middot; {card.venue ?? ""} &middot; {card.year ?? ""}
      </div>
      <div className="chips" style={{ marginBottom: 0 }}>
        <EvidenceChips atlas={atlas} card={card} />
        {card.cited_by.length ? (
          <PlainChip text={fill(atlas.t.cardRow.citedBy, { n: card.cited_by.length })} />
        ) : (
          <PlainChip text={atlas.t.cardRow.notCited} />
        )}
      </div>
    </article>
  );
}

/** The side panel of the graph page for one technology. */
export function TechPanel({ atlas, tech }: { atlas: Atlas; tech: Technology }) {
  const m = headline(tech);
  const t = atlas.t.panel;
  return (
    <>
      <div className="small muted">
        <Swatch domain={tech.domain} /> {atlas.domains.get(tech.domain)?.name}
      </div>
      <h3 style={{ margin: "4px 0 6px" }}>
        <Link href={techPath(tech.id, undefined, atlas.lang)}>{tech.name}</Link>
      </h3>
      <div className="chips">
        <StatusChip atlas={atlas} status={tech.status} />
        {tech.worst_open_severity ? <SeverityChip atlas={atlas} severity={tech.worst_open_severity} /> : null}
      </div>
      <p className="small">{firstSentence(tech.statement)}</p>
      {m && m.display.gap_to_target ? (
        <p className="small">
          <b>{atlas.metrics.get(m.metric)?.name}</b>: {fill(t.toTarget, { distance: m.display.gap_to_target })}
        </p>
      ) : null}
      <p className="small" style={{ marginBottom: 4 }}>
        <b>{t.requires}</b>{" "}
        {tech.requires.length ? <TechLinks atlas={atlas} ids={tech.requires.map((r) => r.technology)} /> : t.nothingRecorded}
      </p>
      <p className="small" style={{ marginBottom: 8 }}>
        <b>{t.requiredBy}</b>{" "}
        {tech.required_by.length ? <TechLinks atlas={atlas} ids={tech.required_by.map((r) => r.technology)} /> : t.nothingYet}
      </p>
      <Link href={techPath(tech.id, undefined, atlas.lang)}>{t.open}</Link>
    </>
  );
}
