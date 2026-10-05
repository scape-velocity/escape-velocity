/* A technology: statement, facts, metrics, gaps, dependencies with the graph around it, and the
   evidence it cites. A port of techView() in site/app.js. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CardRow, GapCard, MetricCard } from "@/components/cards";
import { GapScroll } from "@/components/GapScroll";
import { Graph } from "@/components/Graph";
import { Chip, EvidenceLinks, Paragraphs, People, PlainChip, StatusChip, Swatch, TechLink, TranslationNotice } from "@/components/ui";
import { fill, type Lang } from "@/i18n";
import { firstSentence, oneLine } from "@/lib/format";
import type { GraphTech } from "@/lib/graph";
import { headline, type Atlas } from "@/lib/model";
import { loadAtlas } from "@/lib/load";
import { domainPath, techPath } from "@/lib/paths";
import { pageMetadata } from "@/lib/site";
import type { Requirement, Technology } from "@/lib/types";

export function techParams(): { domain: string; slug: string }[] {
  return loadAtlas().data.technologies.map((t) => {
    const [domain, slug] = t.id.split("/");
    return { domain, slug };
  });
}

/** The first sentence of the statement, followed by the headline metric when there is one. */
function describe(atlas: Atlas, tech: Technology): string {
  const t = atlas.t.tech;
  const sentence = firstSentence(tech.statement);
  const m = headline(tech);
  if (!m || !m.display.current) return sentence;
  const target = m.display.target ? fill(t.describeTarget, { target: m.display.target }) : "";
  return fill(t.describe, { sentence, metric: atlas.metricName(m.metric), current: m.display.current, target });
}

export function techMetadata(lang: Lang, domain: string, slug: string): Metadata {
  const atlas = loadAtlas(lang);
  const tech = atlas.techs.get(`${domain}/${slug}`);
  if (!tech) return {};
  return pageMetadata(lang, tech.name, describe(atlas, tech), techPath(tech.id));
}

function Deps({ atlas, items }: { atlas: Atlas; items: Requirement[] }) {
  return (
    <ul className="deps">
      {items.map((r) => (
        <li key={r.technology}>
          <b>
            <TechLink atlas={atlas} id={r.technology} />
          </b>{" "}
          <span className="why">
            {oneLine(r.why)}
            {r.need ? fill(atlas.t.tech.need, { need: oneLine(r.need) }) : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TechView({ lang, domain: domainId, slug }: { lang: Lang; domain: string; slug: string }) {
  const atlas = loadAtlas(lang);
  const t = atlas.t.tech;
  const data = atlas.data;
  const tech = atlas.techs.get(`${domainId}/${slug}`);
  if (!tech) notFound();
  const domain = atlas.domains.get(tech.domain);
  const sdgs = (tech.sdgs ?? []).map((n) => atlas.sdgName(n)).filter((name): name is string => Boolean(name));
  const cited = tech.evidence.map((key) => atlas.cards.get(key)).filter((c) => c !== undefined);
  const neighborhood = [...new Set([tech.id, ...atlas.transitive(tech.id, "down"), ...atlas.transitive(tech.id, "up")])];
  const hasGraph = neighborhood.length > 1;
  const graphTechs: GraphTech[] = neighborhood.map((id) => {
    const other = atlas.techs.get(id) as Technology;
    return {
      id: other.id,
      name: other.name,
      domain: other.domain,
      status: other.status,
      requires: other.requires.map((r) => r.technology),
      required_by: other.required_by.map((r) => r.technology),
    };
  });

  return (
    <>
      <TranslationNotice atlas={atlas} status={tech.translation} />
      <p className="eyebrow">
        <Swatch domain={tech.domain} /> <Link href={domainPath(tech.domain, lang)}>{domain?.name ?? tech.domain}</Link> /{" "}
        <span className="mono">{tech.id}</span>
      </p>
      <div className="tech-head">
        <h1>{tech.name}</h1>
        <div className="chips">
          <StatusChip atlas={atlas} status={tech.status} />
          <PlainChip text={tech.readiness_name} title={t.readinessLevel} />
          {tech.horizon ? <PlainChip text={fill(t.horizon, { horizon: tech.horizon })} /> : null}
          {tech.worst_open_severity ? (
            <Chip
              text={fill(t.gapOpen, { severity: atlas.label("severity", tech.worst_open_severity) })}
              cls={`sev-${tech.worst_open_severity}`}
              title={t.worstTitle}
            />
          ) : null}
        </div>
      </div>
      <div className="statement">
        <Paragraphs text={tech.statement} />
      </div>
      {tech.scope ? (
        <details className="scope">
          <summary>{t.scope}</summary>
          <Paragraphs text={tech.scope} />
        </details>
      ) : null}
      <dl className="facts">
        <div>
          <dt>{t.readiness}</dt>
          <dd>
            {tech.readiness_name}
            {tech.readiness_note ? <div className="small muted">{oneLine(tech.readiness_note)}</div> : null}
            <EvidenceLinks atlas={atlas} keys={tech.readiness_evidence} />
          </dd>
        </div>
        <div>
          <dt>{t.serves}</dt>
          <dd>{sdgs.length ? sdgs.join(", ") : "–"}</dd>
        </div>
        <div>
          <dt>{t.lastReviewed}</dt>
          <dd>{tech.last_reviewed || t.never}</dd>
        </div>
        <div>
          <dt>{t.curators}</dt>
          <dd>
            <People atlas={atlas} handles={tech.curators} role="curators" />
          </dd>
        </div>
      </dl>
      {tech.status === "proposed" ? <p className="notice">{t.proposed}</p> : null}

      <h2>{t.metrics}</h2>
      {tech.metrics.length ? (
        <div className="grid grid-two">
          {tech.metrics.map((m, i) => (
            <MetricCard key={m.id ?? `${m.metric}-${i}`} atlas={atlas} metric={m} />
          ))}
        </div>
      ) : (
        <p className="empty">{t.noMetric}</p>
      )}

      <h2>{t.gaps}</h2>
      {tech.gaps.length ? (
        <div className="stack">
          {tech.gaps.map((g) => (
            <GapCard key={g.id} atlas={atlas} gap={g} tech={tech} showOwner={false} />
          ))}
        </div>
      ) : (
        <p className="empty">{t.noGap}</p>
      )}

      <h2>{t.dependencies}</h2>
      <div className="grid grid-two">
        <div>
          <h3>{t.requires}</h3>
          {tech.requires.length ? <Deps atlas={atlas} items={tech.requires} /> : <p className="empty">{t.nothing}</p>}
          <h3 style={{ marginTop: "1.2rem" }}>{t.requiredBy}</h3>
          {tech.required_by.length ? (
            <Deps atlas={atlas} items={tech.required_by} />
          ) : (
            <p className="empty">{t.noDependents}</p>
          )}
          {tech.blocks.length ? (
            <>
              <h3 style={{ marginTop: "1.2rem" }}>{t.holdsOpen}</h3>
              <ul className="deps">
                {tech.blocks.map((b) => (
                  <li key={`${b.technology}#${b.gap}`}>
                    <Link href={techPath(b.technology, b.gap, lang)}>{b.title}</Link>
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
                label={fill(t.graphLabel, { name: tech.name })}
                techs={graphTechs}
                domains={data.taxonomy.domains.map((d) => ({ id: d.id, name: d.name }))}
                focus={tech.id}
                layout="tree"
                lang={lang}
                failedText={atlas.t.graph.failed}
              />
              <p className="small muted">{t.graphHelp}</p>
            </>
          ) : null}
        </div>
      </div>

      <h2>{t.evidence}</h2>
      {cited.length ? (
        <div className="stack">
          {cited.map((card, i) => (
            <CardRow key={`${card.key}-${i}`} atlas={atlas} card={card} />
          ))}
        </div>
      ) : (
        <p className="empty">{t.noEvidence}</p>
      )}

      {tech.alan_machine.length ? (
        <>
          <h2>{t.alanMachine}</h2>
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
        <a href={tech.source}>{atlas.t.common.sourceToml}</a> &middot; <a href={tech.page}>{t.page}</a> &middot;{" "}
        <a href={`${data.repository}/issues/new/choose`}>{t.suggest}</a>
      </p>
      <Suspense fallback={null}>
        <GapScroll />
      </Suspense>
    </>
  );
}
