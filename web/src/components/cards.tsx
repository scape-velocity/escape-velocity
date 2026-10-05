/* The repeated blocks of the views of site/app.js: barChart, domainCard, metricCard, gapCard,
   cardRow and the side panel of the graph. Server components. */

import Link from "next/link";
import type { CSSProperties } from "react";

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

export function BarChart({ atlas, rows, max, unitLabel }: { atlas: Atlas; rows: BarRow[]; max: number; unitLabel: string }) {
  const ticks =
    unitLabel === "orders of magnitude"
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
              <Link href={techPath(tech.id)}>{tech.name}</Link>{" "}
              <span className="muted">
                {def?.name ?? metric.metric}: {metric.display.current} now, {metric.display.target} target
              </span>
            </div>
            <div className="bar-track" role="img" aria-label={`${tech.name}: ${metric.display.gap_to_target} to target`}>
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
  return (
    <article className="card domain-card">
      <h3>
        <Swatch domain={domain.id} />
        <Link href={domainPath(domain.id)}>{domain.name}</Link>
      </h3>
      <p>{domain.summary}</p>
      <p className="small muted">
        {techs.length} technolog{techs.length === 1 ? "y" : "ies"} &middot; {gaps} open gap{gaps === 1 ? "" : "s"}
      </p>
      <ul className="tech-list">
        {techs.map((t) => {
          const m = headline(t);
          const distance = m?.display.gap_to_target;
          const note = distance ? (distance === "met" ? "met" : `${distance.replace("orders of magnitude", "orders")} to go`) : "";
          return (
            <li key={t.id}>
              <Link href={techPath(t.id)}>
                <span className={`status-dot status-${t.status}`} title={t.status} />
                {t.name}
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
  const sources = [metric.current?.evidence, metric.target?.evidence, metric.limit?.evidence].filter(
    (k): k is string => Boolean(k),
  );
  const meaning = "meaning" in def && def.meaning ? `${def.meaning.replace(/\.?$/, ".")} ` : "";
  const direction = "direction" in def && def.direction ? `${def.direction === "lower" ? "Lower" : "Higher"} is better.` : "";
  return (
    <article className="card metric-card">
      <h3>
        <span>
          {def.name}
          {metric.headline ? (
            <>
              {" "}
              <span className="chip" title="The metric shown for this technology in summaries">
                headline
              </span>
            </>
          ) : null}
        </span>
        {distance ? (
          <span className={`distance ${size !== null && size <= 0 ? "met" : ""}`}>
            {distance === "met" ? "target met" : `${distance} to go`}
          </span>
        ) : null}
      </h3>
      <div className="small muted">
        {meaning}
        {direction}
      </div>
      <Ladder metric={metric} def={def} />
      <div className="metric-values">
        <div>
          <span>Current{metric.current?.as_of ? ` (${metric.current.as_of})` : ""}</span>
          <b>{metric.display.current || "–"}</b>
        </div>
        <div>
          <span>Target</span>
          <b>{metric.display.target || "–"}</b>
        </div>
        <div>
          <span>Limit</span>
          <b>{metric.display.limit || "–"}</b>
        </div>
      </div>
      {metric.conditions ? (
        <div className="rationale">
          <b>Conditions.</b> {oneLine(metric.conditions)}
        </div>
      ) : null}
      {metric.target?.rationale ? (
        <div className="rationale">
          <b>Why this target.</b> {oneLine(metric.target.rationale)}
        </div>
      ) : null}
      {metric.limit?.basis ? (
        <div className="rationale">
          <b>Limit.</b> {oneLine(metric.limit.basis)}
          {metric.display.target_to_limit ? ` Target to limit: ${metric.display.target_to_limit}.` : ""}
        </div>
      ) : null}
      {metric.current?.note ? (
        <div className="rationale">
          <b>Note.</b> {oneLine(metric.current.note)}
        </div>
      ) : null}
      <EvidenceLinks atlas={atlas} keys={sources} />
    </article>
  );
}

export function GapCard({ atlas, gap, tech, showOwner }: { atlas: Atlas; gap: Gap; tech: Technology; showOwner: boolean }) {
  return (
    <article className={`card gap-card sev-${gap.severity}`} id={`gap-${gap.id}`}>
      <div className="card-title">
        <h3>{gap.title}</h3>
      </div>
      {showOwner ? (
        <div className="owner">
          <Swatch domain={tech.domain} /> <Link href={techPath(tech.id)}>{tech.name}</Link>
        </div>
      ) : null}
      <div className="chips">
        <SeverityChip atlas={atlas} severity={gap.severity} />
        <PlainChip text={gap.type.replace(/-/g, " ")} title={atlas.meaning("gap_type", gap.type)} />
        <PlainChip text={`layer: ${gap.layer}`} title={atlas.meaning("layer", gap.layer)} />
        <PlainChip text={gap.status} title={atlas.meaning("gap_status", gap.status)} />
      </div>
      <Paragraphs text={gap.description} />
      {gap.blocked_by && gap.blocked_by.length ? (
        <p className="small">
          <b>Held open by:</b> <TechLinks atlas={atlas} ids={gap.blocked_by} />
        </p>
      ) : null}
      {gap.approach && gap.approach.length ? (
        <>
          <p className="small" style={{ marginBottom: 0 }}>
            <b>Approaches</b>
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
                    <Link className="mono small" href={cardPath(k)}>
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

export function CardRow({ atlas, card }: { atlas: Atlas; card: EvidenceCard }) {
  return (
    <article className="card">
      <div className="card-title">
        <h3 style={{ fontSize: "1rem" }}>
          <Link href={cardPath(card.key)}>{card.title}</Link>
        </h3>
        <span className="mono small muted">{card.key}</span>
      </div>
      <div className="small muted">
        {authorsShort(card)} &middot; {card.venue ?? ""} &middot; {card.year ?? ""}
      </div>
      <div className="chips" style={{ marginBottom: 0 }}>
        <PlainChip text={card.class} title={atlas.meaning("evidence_class", card.class)} />
        <PlainChip text={card.status} title={atlas.meaning("evidence_status", card.status)} />
        <PlainChip text={card.type} title={atlas.meaning("evidence_type", card.type)} />
        {card.cited_by.length ? <PlainChip text={`cited by ${card.cited_by.length}`} /> : <PlainChip text="not cited" />}
      </div>
    </article>
  );
}

/** The side panel of the graph page for one technology. */
export function TechPanel({ atlas, tech }: { atlas: Atlas; tech: Technology }) {
  const m = headline(tech);
  return (
    <>
      <div className="small muted">
        <Swatch domain={tech.domain} /> {atlas.domains.get(tech.domain)?.name}
      </div>
      <h3 style={{ margin: "4px 0 6px" }}>
        <Link href={techPath(tech.id)}>{tech.name}</Link>
      </h3>
      <div className="chips">
        <StatusChip atlas={atlas} status={tech.status} />
        {tech.worst_open_severity ? <SeverityChip atlas={atlas} severity={tech.worst_open_severity} /> : null}
      </div>
      <p className="small">{firstSentence(tech.statement)}</p>
      {m && m.display.gap_to_target ? (
        <p className="small">
          <b>{atlas.metrics.get(m.metric)?.name}</b>: {m.display.gap_to_target} to target
        </p>
      ) : null}
      <p className="small" style={{ marginBottom: 4 }}>
        <b>Requires:</b>{" "}
        {tech.requires.length ? <TechLinks atlas={atlas} ids={tech.requires.map((r) => r.technology)} /> : "nothing recorded"}
      </p>
      <p className="small" style={{ marginBottom: 8 }}>
        <b>Required by:</b>{" "}
        {tech.required_by.length ? <TechLinks atlas={atlas} ids={tech.required_by.map((r) => r.technology)} /> : "nothing yet"}
      </p>
      <Link href={techPath(tech.id)}>Open the technology</Link>
    </>
  );
}
