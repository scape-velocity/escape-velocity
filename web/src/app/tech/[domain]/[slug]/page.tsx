/* A technology: statement, facts, metrics, gaps, dependencies with the graph around it, and the
   evidence it cites. A port of techView() in site/app.js. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CardRow, GapCard, MetricCard } from "@/components/cards";
import { GapScroll } from "@/components/GapScroll";
import { Graph } from "@/components/Graph";
import { Chip, EvidenceLinks, Paragraphs, People, PlainChip, StatusChip, Swatch, TechLink } from "@/components/ui";
import { firstSentence, oneLine } from "@/lib/format";
import type { GraphTech } from "@/lib/graph";
import { headline } from "@/lib/model";
import { loadAtlas } from "@/lib/load";
import { domainPath, techPath } from "@/lib/paths";
import { pageMetadata } from "@/lib/site";
import type { Requirement, Technology } from "@/lib/types";

type Params = { params: Promise<{ domain: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return loadAtlas().data.technologies.map((t) => {
    const [domain, slug] = t.id.split("/");
    return { domain, slug };
  });
}

/** The first sentence of the statement, followed by the headline metric when there is one. */
function describe(tech: Technology, metricName: (id: string) => string): string {
  const sentence = firstSentence(tech.statement);
  const m = headline(tech);
  if (!m || !m.display.current) return sentence;
  const target = m.display.target ? `, target ${m.display.target}` : "";
  return `${sentence} ${metricName(m.metric)}: ${m.display.current} now${target}.`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { domain, slug } = await params;
  const atlas = loadAtlas();
  const tech = atlas.techs.get(`${domain}/${slug}`);
  if (!tech) return {};
  return pageMetadata(tech.name, describe(tech, (id) => atlas.metricName(id)), techPath(tech.id));
}

function Deps({ atlas, items }: { atlas: ReturnType<typeof loadAtlas>; items: Requirement[] }) {
  return (
    <ul className="deps">
      {items.map((r) => (
        <li key={r.technology}>
          <b>
            <TechLink atlas={atlas} id={r.technology} />
          </b>{" "}
          <span className="why">
            {oneLine(r.why)}
            {r.need ? ` Need: ${oneLine(r.need)}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function TechPage({ params }: Params) {
  const { domain: domainId, slug } = await params;
  const atlas = loadAtlas();
  const data = atlas.data;
  const tech = atlas.techs.get(`${domainId}/${slug}`);
  if (!tech) notFound();
  const domain = atlas.domains.get(tech.domain);
  const sdgs = (tech.sdgs ?? []).map((n) => atlas.sdgName(n)).filter((name): name is string => Boolean(name));
  const cited = tech.evidence.map((key) => atlas.cards.get(key)).filter((c) => c !== undefined);
  const neighborhood = [...new Set([tech.id, ...atlas.transitive(tech.id, "down"), ...atlas.transitive(tech.id, "up")])];
  const hasGraph = neighborhood.length > 1;
  const graphTechs: GraphTech[] = neighborhood.map((id) => {
    const t = atlas.techs.get(id) as Technology;
    return {
      id: t.id,
      name: t.name,
      domain: t.domain,
      status: t.status,
      requires: t.requires.map((r) => r.technology),
      required_by: t.required_by.map((r) => r.technology),
    };
  });

  return (
    <>
      <p className="eyebrow">
        <Swatch domain={tech.domain} /> <Link href={domainPath(tech.domain)}>{domain?.name ?? tech.domain}</Link> /{" "}
        <span className="mono">{tech.id}</span>
      </p>
      <div className="tech-head">
        <h1>{tech.name}</h1>
        <div className="chips">
          <StatusChip atlas={atlas} status={tech.status} />
          <PlainChip text={tech.readiness_name} title="Readiness level" />
          {tech.horizon ? <PlainChip text={`horizon ${tech.horizon}`} /> : null}
          {tech.worst_open_severity ? (
            <Chip
              text={`${tech.worst_open_severity} gap open`}
              cls={`sev-${tech.worst_open_severity}`}
              title="The most severe open gap"
            />
          ) : null}
        </div>
      </div>
      <div className="statement">
        <Paragraphs text={tech.statement} />
      </div>
      {tech.scope ? (
        <details className="scope">
          <summary>Scope</summary>
          <Paragraphs text={tech.scope} />
        </details>
      ) : null}
      <dl className="facts">
        <div>
          <dt>Readiness</dt>
          <dd>
            {tech.readiness_name}
            {tech.readiness_note ? <div className="small muted">{oneLine(tech.readiness_note)}</div> : null}
            <EvidenceLinks atlas={atlas} keys={tech.readiness_evidence} />
          </dd>
        </div>
        <div>
          <dt>Serves</dt>
          <dd>{sdgs.length ? sdgs.join(", ") : "–"}</dd>
        </div>
        <div>
          <dt>Last reviewed</dt>
          <dd>{tech.last_reviewed || "never"}</dd>
        </div>
        <div>
          <dt>Curators</dt>
          <dd>
            <People atlas={atlas} handles={tech.curators} role="curators" />
          </dd>
        </div>
      </dl>
      {tech.status === "proposed" ? (
        <p className="notice">
          Proposed: the statement and scope are written, but the metrics, target or gaps are not complete yet. One sourced
          number is a real contribution.
        </p>
      ) : null}

      <h2>Metrics</h2>
      {tech.metrics.length ? (
        <div className="grid grid-two">
          {tech.metrics.map((m, i) => (
            <MetricCard key={m.id ?? `${m.metric}-${i}`} atlas={atlas} metric={m} />
          ))}
        </div>
      ) : (
        <p className="empty">No metric yet.</p>
      )}

      <h2>Gaps</h2>
      {tech.gaps.length ? (
        <div className="stack">
          {tech.gaps.map((g) => (
            <GapCard key={g.id} atlas={atlas} gap={g} tech={tech} showOwner={false} />
          ))}
        </div>
      ) : (
        <p className="empty">No gap recorded yet.</p>
      )}

      <h2>Dependencies</h2>
      <div className="grid grid-two">
        <div>
          <h3>Requires</h3>
          {tech.requires.length ? <Deps atlas={atlas} items={tech.requires} /> : <p className="empty">Nothing recorded.</p>}
          <h3 style={{ marginTop: "1.2rem" }}>Required by</h3>
          {tech.required_by.length ? (
            <Deps atlas={atlas} items={tech.required_by} />
          ) : (
            <p className="empty">Nothing in the atlas depends on it yet.</p>
          )}
          {tech.blocks.length ? (
            <>
              <h3 style={{ marginTop: "1.2rem" }}>Holds open</h3>
              <ul className="deps">
                {tech.blocks.map((b) => (
                  <li key={`${b.technology}#${b.gap}`}>
                    <Link href={techPath(b.technology, b.gap)}>{b.title}</Link>
                    <span className="why">{atlas.techName(b.technology)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
        <div>
          {hasGraph ? (
            <>
              <Graph
                className="graph-box"
                label={`Dependency graph around ${tech.name}`}
                techs={graphTechs}
                domains={data.taxonomy.domains.map((d) => ({ id: d.id, name: d.name }))}
                focus={tech.id}
                layout="tree"
              />
              <p className="small muted">Arrows point from a technology to what it requires. Select a node to open it.</p>
            </>
          ) : null}
        </div>
      </div>

      <h2>Evidence</h2>
      {cited.length ? (
        <div className="stack">
          {cited.map((card, i) => (
            <CardRow key={`${card.key}-${i}`} atlas={atlas} card={card} />
          ))}
        </div>
      ) : (
        <p className="empty">No evidence cited yet.</p>
      )}

      {tech.alan_machine.length ? (
        <>
          <h2>In The Alan Machine</h2>
          <ul>
            {tech.alan_machine.map((item) => (
              <li key={item.url}>
                <a href={item.url}>{item.title}</a>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="small muted" style={{ marginTop: "2rem" }}>
        <a href={tech.source}>Source TOML</a> &middot; <a href={tech.page}>Page on GitHub</a> &middot;{" "}
        <a href={`${data.repository}/issues/new/choose`}>Suggest a correction</a>
      </p>
      <Suspense fallback={null}>
        <GapScroll />
      </Suspense>
    </>
  );
}
