/* The overview: totals, the distance to target of every headline metric, the domains, the
   critical gaps and the most depended-on technologies. A port of overviewView() in site/app.js. */

import type { Metadata } from "next";
import Link from "next/link";

import { BarChart, DomainCard, type BarRow } from "@/components/cards";
import { TranslationNotice } from "@/components/ui";
import { fill, plural, type Lang } from "@/i18n";
import { headline, openGaps } from "@/lib/model";
import { loadAtlas } from "@/lib/load";
import { localePath, techPath } from "@/lib/paths";
import { pageMetadata } from "@/lib/site";

export function overviewMetadata(lang: Lang): Metadata {
  return pageMetadata(lang, null, loadAtlas(lang).t.site.description, "/");
}

export function OverviewView({ lang }: { lang: Lang }) {
  const atlas = loadAtlas(lang);
  const t = atlas.t.overview;
  const data = atlas.data;
  const techs = data.technologies;
  const gaps = techs.flatMap((tech) => openGaps(tech).map((g) => ({ gap: g, tech })));
  const critical = gaps.filter((r) => r.gap.severity === "critical");
  const verified = data.evidence.filter((c) => c.status === "verified").length;
  const mappedOrBetter = techs.filter((tech) => ["mapped", "tracked", "achieved"].includes(tech.status)).length;

  const withGap = techs
    .map((tech) => ({ tech, metric: headline(tech) }))
    .filter((r): r is BarRow => r.metric !== null && r.metric.gap_to_target !== null && r.metric.gap_to_target !== undefined);
  const isLog = (r: BarRow) => atlas.metrics.get(r.metric.metric)?.scale === "log";
  const byGap = (a: BarRow, b: BarRow) => (b.metric.gap_to_target as number) - (a.metric.gap_to_target as number);
  const logRows = withGap.filter(isLog).sort(byGap);
  const linearRows = withGap.filter((r) => !isLog(r)).sort(byGap);
  const maxOrders = Math.max(1, Math.ceil(Math.max(0, ...logRows.map((r) => r.metric.gap_to_target as number))));

  const depended = techs
    .filter((tech) => tech.required_by.length)
    .sort(
      (a, b) =>
        b.dependent_domains.length - a.dependent_domains.length ||
        b.dependents.length - a.dependents.length ||
        b.blocks.length - a.blocks.length,
    )
    .slice(0, 8);

  return (
    <>
      <TranslationNotice atlas={atlas} status={data.translation} />
      <section className="hero">
        <h1>{t.title}</h1>
        <p className="lede">{t.lede}</p>
      </section>
      <div className="stats">
        <div className="stat">
          <b>{techs.length}</b>
          <span>{fill(t.statTechs, { mapped: mappedOrBetter })}</span>
        </div>
        <div className="stat">
          <b>{atlas.domains.size}</b>
          <span>{t.statDomains}</span>
        </div>
        <div className="stat">
          <b>{gaps.length}</b>
          <span>{fill(t.statGaps, { critical: critical.length })}</span>
        </div>
        <div className="stat">
          <b>{data.evidence.length}</b>
          <span>{fill(t.statCards, { verified })}</span>
        </div>
      </div>

      <div className="section-head">
        <h2>{t.distance}</h2>
        <Link href={localePath("/gaps/", lang)}>{t.allGaps}</Link>
      </div>
      <p className="muted small">{t.distanceText}</p>
      {logRows.length ? (
        <BarChart atlas={atlas} rows={logRows} max={maxOrders} log />
      ) : (
        <p className="empty">{t.noHeadline}</p>
      )}
      {linearRows.length ? (
        <>
          <h3 style={{ marginTop: "1.4rem" }}>{t.percentage}</h3>
          <BarChart atlas={atlas} rows={linearRows} max={100} log={false} />
        </>
      ) : null}

      <div className="section-head">
        <h2>{t.domains}</h2>
        <Link href={localePath("/graph/", lang)}>{t.seeGraph}</Link>
      </div>
      <div className="grid grid-domains">
        {[...atlas.domains.keys()].map((id) => (
          <DomainCard key={id} atlas={atlas} domainId={id} />
        ))}
      </div>

      <div className="grid grid-two" style={{ marginTop: "2rem" }}>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>{t.critical}</h2>
          {critical.length ? (
            <ol className="rank">
              {critical.map(({ gap, tech }) => (
                <li key={`${tech.id}#${gap.id}`}>
                  <div>
                    <Link href={techPath(tech.id, gap.id, lang)}>{gap.title}</Link>
                    <div className="muted">
                      {tech.name} &middot; {atlas.label("gap_type", gap.type)} &middot; {atlas.label("layer", gap.layer)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty">{t.noCritical}</p>
          )}
        </section>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>{t.depended}</h2>
          {depended.length ? (
            <ol className="rank">
              {depended.map((tech) => (
                <li key={tech.id}>
                  <div>
                    <Link href={techPath(tech.id, undefined, lang)}>{tech.name}</Link>
                    <div className="muted">
                      {fill(t.neededBy, { names: tech.required_by.map((r) => atlas.techName(r.technology)).join(", ") })}
                      {tech.blocks.length ? (
                        <>
                          {" "}
                          &middot; {plural(t.holdsOpen, tech.blocks.length)}
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty">{t.noDeps}</p>
          )}
        </section>
      </div>
    </>
  );
}
