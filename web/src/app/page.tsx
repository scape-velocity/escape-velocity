/* The overview: totals, the distance to target of every headline metric, the domains, the
   critical gaps and the most depended-on technologies. A port of overviewView() in site/app.js. */

import type { Metadata } from "next";
import Link from "next/link";

import { BarChart, DomainCard, type BarRow } from "@/components/cards";
import { headline, openGaps } from "@/lib/model";
import { loadAtlas } from "@/lib/load";
import { techPath } from "@/lib/paths";
import { pageMetadata, SITE_DESCRIPTION } from "@/lib/site";

export function generateMetadata(): Metadata {
  return pageMetadata(null, SITE_DESCRIPTION, "/");
}

export default function OverviewPage() {
  const atlas = loadAtlas();
  const data = atlas.data;
  const techs = data.technologies;
  const gaps = techs.flatMap((t) => openGaps(t).map((g) => ({ gap: g, tech: t })));
  const critical = gaps.filter((r) => r.gap.severity === "critical");
  const verified = data.evidence.filter((c) => c.status === "verified").length;
  const mappedOrBetter = techs.filter((t) => ["mapped", "tracked", "achieved"].includes(t.status)).length;

  const withGap = techs
    .map((t) => ({ tech: t, metric: headline(t) }))
    .filter((r): r is BarRow => r.metric !== null && r.metric.gap_to_target !== null && r.metric.gap_to_target !== undefined);
  const isLog = (r: BarRow) => atlas.metrics.get(r.metric.metric)?.scale === "log";
  const byGap = (a: BarRow, b: BarRow) => (b.metric.gap_to_target as number) - (a.metric.gap_to_target as number);
  const logRows = withGap.filter(isLog).sort(byGap);
  const linearRows = withGap.filter((r) => !isLog(r)).sort(byGap);
  const maxOrders = Math.max(1, Math.ceil(Math.max(0, ...logRows.map((r) => r.metric.gap_to_target as number))));

  const depended = techs
    .filter((t) => t.required_by.length)
    .sort(
      (a, b) =>
        b.dependent_domains.length - a.dependent_domains.length ||
        b.dependents.length - a.dependents.length ||
        b.blocks.length - a.blocks.length,
    )
    .slice(0, 8);

  return (
    <>
      <section className="hero">
        <h1>What each technology still needs</h1>
        <p className="lede">
          Escape Velocity is an open atlas of technologies on their way to maturity: where each one stands, the target that
          would make it useful, the physical limit behind that target, the gaps in between and the other technologies it
          waits on. Every number has a source.
        </p>
      </section>
      <div className="stats">
        <div className="stat">
          <b>{techs.length}</b>
          <span>technologies, {mappedOrBetter} fully mapped</span>
        </div>
        <div className="stat">
          <b>{atlas.domains.size}</b>
          <span>domains</span>
        </div>
        <div className="stat">
          <b>{gaps.length}</b>
          <span>open gaps, {critical.length} critical</span>
        </div>
        <div className="stat">
          <b>{data.evidence.length}</b>
          <span>evidence cards, {verified} verified by a curator</span>
        </div>
      </div>

      <div className="section-head">
        <h2>Distance to target</h2>
        <Link href="/gaps/">All gaps</Link>
      </div>
      <p className="muted small">
        The headline metric of each technology: how far the best demonstrated value is from the target, in orders of
        magnitude. Open a technology for the conditions and the evidence behind each value.
      </p>
      {logRows.length ? (
        <BarChart atlas={atlas} rows={logRows} max={maxOrders} unitLabel="orders of magnitude" />
      ) : (
        <p className="empty">No headline metric has both a current value and a target yet.</p>
      )}
      {linearRows.length ? (
        <>
          <h3 style={{ marginTop: "1.4rem" }}>Percentage metrics</h3>
          <BarChart atlas={atlas} rows={linearRows} max={100} unitLabel="percentage points" />
        </>
      ) : null}

      <div className="section-head">
        <h2>Domains</h2>
        <Link href="/graph/">See the graph</Link>
      </div>
      <div className="grid grid-domains">
        {[...atlas.domains.keys()].map((id) => (
          <DomainCard key={id} atlas={atlas} domainId={id} />
        ))}
      </div>

      <div className="grid grid-two" style={{ marginTop: "2rem" }}>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Critical gaps</h2>
          {critical.length ? (
            <ol className="rank">
              {critical.map(({ gap, tech }) => (
                <li key={`${tech.id}#${gap.id}`}>
                  <div>
                    <Link href={techPath(tech.id, gap.id)}>{gap.title}</Link>
                    <div className="muted">
                      {tech.name} &middot; {gap.type.replace(/-/g, " ")} &middot; {gap.layer}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty">No critical gaps recorded.</p>
          )}
        </section>
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Most depended on</h2>
          {depended.length ? (
            <ol className="rank">
              {depended.map((t) => (
                <li key={t.id}>
                  <div>
                    <Link href={techPath(t.id)}>{t.name}</Link>
                    <div className="muted">
                      needed by {t.required_by.map((r) => atlas.techName(r.technology)).join(", ")}
                      {t.blocks.length ? (
                        <>
                          {" "}
                          &middot; holds open {t.blocks.length} gap{t.blocks.length > 1 ? "s" : ""}
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty">No dependencies recorded yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
