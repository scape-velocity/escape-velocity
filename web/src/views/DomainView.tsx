/* A domain: its technologies with their headline metric. A port of domainView() in site/app.js. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlainChip, People, StatusChip, Swatch, TranslationNotice } from "@/components/ui";
import { fill, plural, type Lang } from "@/i18n";
import { firstSentence } from "@/lib/format";
import { headline, openGaps } from "@/lib/model";
import { loadAtlas } from "@/lib/load";
import { domainPath, localePath, techPath } from "@/lib/paths";
import { pageMetadata } from "@/lib/site";

export function domainParams(): { id: string }[] {
  return loadAtlas().data.taxonomy.domains.map((d) => ({ id: d.id }));
}

export function domainMetadata(lang: Lang, id: string): Metadata {
  const domain = loadAtlas(lang).domains.get(id);
  if (!domain) return {};
  return pageMetadata(lang, domain.name, domain.summary, domainPath(domain.id));
}

export function DomainView({ lang, id }: { lang: Lang; id: string }) {
  const atlas = loadAtlas(lang);
  const t = atlas.t.domain;
  const domain = atlas.domains.get(id);
  if (!domain) notFound();
  const techs = atlas.techsOf(id);
  const scale = atlas.scales.get(domain.readiness_scale);
  const sdgs = (domain.sdgs ?? []).map((n) => atlas.sdgName(n)).filter((name): name is string => Boolean(name));
  return (
    <>
      <TranslationNotice atlas={atlas} status={atlas.data.translation} />
      <p className="eyebrow">
        <Link href={localePath("/", lang)}>{atlas.t.shell.nav.overview}</Link> / {t.eyebrow}
      </p>
      <h1>
        <Swatch domain={id} style={{ width: 16, height: 16 }} /> {domain.name}
      </h1>
      <p className="lede">{domain.summary}</p>
      <div className="chips">
        {scale ? <PlainChip text={fill(t.readinessOn, { scale: scale.name })} title={scale.summary} /> : null}
        {sdgs.map((name) => (
          <PlainChip key={name} text={fill(t.sdg, { name })} />
        ))}
      </div>
      <p className="small muted" style={{ margin: ".8rem 0 0" }}>
        {t.moderators} <People atlas={atlas} handles={domain.moderators} role="moderators" />
      </p>
      <div className="stack" style={{ marginTop: "1.2rem" }}>
        {techs.map((tech) => {
          const m = headline(tech);
          const open = openGaps(tech).length;
          return (
            <article className="card" key={tech.id}>
              <div className="card-title">
                <h3>
                  <Link href={techPath(tech.id, undefined, lang)}>{tech.name}</Link>
                </h3>
                <StatusChip atlas={atlas} status={tech.status} />
              </div>
              <p className="muted" style={{ margin: "6px 0" }}>
                {firstSentence(tech.statement)}
              </p>
              <p className="small" style={{ margin: 0 }}>
                {m ? (
                  <>
                    <b>{atlas.metricName(m.metric)}</b>: {m.display.current || t.noCurrent}
                    {m.display.target ? fill(t.nowTarget, { target: m.display.target }) : ""}
                    {m.display.gap_to_target ? ` (${m.display.gap_to_target})` : ""} &middot;{" "}
                  </>
                ) : null}
                {plural(atlas.t.domainCard.openGaps, open)} &middot; {tech.readiness_name}
              </p>
            </article>
          );
        })}
      </div>
    </>
  );
}
