/* A domain: its technologies with their headline metric. A port of domainView() in site/app.js. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlainChip, People, StatusChip, Swatch } from "@/components/ui";
import { firstSentence } from "@/lib/format";
import { headline, openGaps } from "@/lib/model";
import { loadAtlas } from "@/lib/load";
import { domainPath, techPath } from "@/lib/paths";
import { pageMetadata } from "@/lib/site";

type Params = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return loadAtlas().data.taxonomy.domains.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const domain = loadAtlas().domains.get(id);
  if (!domain) return {};
  return pageMetadata(domain.name, domain.summary, domainPath(domain.id));
}

export default async function DomainPage({ params }: Params) {
  const { id } = await params;
  const atlas = loadAtlas();
  const domain = atlas.domains.get(id);
  if (!domain) notFound();
  const techs = atlas.techsOf(id);
  const scale = atlas.scales.get(domain.readiness_scale);
  const sdgs = (domain.sdgs ?? []).map((n) => atlas.sdgName(n)).filter((name): name is string => Boolean(name));
  return (
    <>
      <p className="eyebrow">
        <Link href="/">Overview</Link> / Domain
      </p>
      <h1>
        <Swatch domain={id} style={{ width: 16, height: 16 }} /> {domain.name}
      </h1>
      <p className="lede">{domain.summary}</p>
      <div className="chips">
        {scale ? <PlainChip text={`Readiness on ${scale.name}`} title={scale.summary} /> : null}
        {sdgs.map((name) => (
          <PlainChip key={name} text={`SDG: ${name}`} />
        ))}
      </div>
      <p className="small muted" style={{ margin: ".8rem 0 0" }}>
        Moderators: <People atlas={atlas} handles={domain.moderators} role="moderators" />
      </p>
      <div className="stack" style={{ marginTop: "1.2rem" }}>
        {techs.map((t) => {
          const m = headline(t);
          const open = openGaps(t).length;
          return (
            <article className="card" key={t.id}>
              <div className="card-title">
                <h3>
                  <Link href={techPath(t.id)}>{t.name}</Link>
                </h3>
                <StatusChip atlas={atlas} status={t.status} />
              </div>
              <p className="muted" style={{ margin: "6px 0" }}>
                {firstSentence(t.statement)}
              </p>
              <p className="small" style={{ margin: 0 }}>
                {m ? (
                  <>
                    <b>{atlas.metricName(m.metric)}</b>: {m.display.current || "no current value"}
                    {m.display.target ? ` now, target ${m.display.target}` : ""}
                    {m.display.gap_to_target ? ` (${m.display.gap_to_target})` : ""} &middot;{" "}
                  </>
                ) : null}
                {open} open gap{open === 1 ? "" : "s"} &middot; {t.readiness_name}
              </p>
            </article>
          );
        })}
      </div>
    </>
  );
}
