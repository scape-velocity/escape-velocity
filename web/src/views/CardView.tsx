/* One evidence card: source, findings with their quotes, and the technologies that cite it. A port
   of cardView() in site/app.js. Quotes are never translated: they are evidence. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EvidenceChips } from "@/components/cards";
import { TechLink, TranslationNotice } from "@/components/ui";
import { fill, type Lang } from "@/i18n";
import { fmtValue, oneLine } from "@/lib/format";
import { loadAtlas } from "@/lib/load";
import { cardPath, localePath } from "@/lib/paths";
import { pageMetadata } from "@/lib/site";

export function cardParams(): { key: string }[] {
  return loadAtlas().data.evidence.map((c) => ({ key: c.key }));
}

export function cardMetadata(lang: Lang, key: string): Metadata {
  const card = loadAtlas(lang).cards.get(key);
  if (!card) return {};
  return pageMetadata(lang, card.title, card.title, cardPath(card.key));
}

export function CardView({ lang, cardKey }: { lang: Lang; cardKey: string }) {
  const atlas = loadAtlas(lang);
  const t = atlas.t.card;
  const data = atlas.data;
  const card = atlas.cards.get(cardKey);
  if (!card) notFound();
  return (
    <>
      <TranslationNotice atlas={atlas} status={card.translation} />
      <p className="eyebrow">
        <Link href={localePath("/evidence/", lang)}>{atlas.t.shell.nav.evidence}</Link> / <span className="mono">{card.key}</span>
      </p>
      <h1>{card.title}</h1>
      <p className="muted">
        {(card.authors ?? []).join(", ")}
        <br />
        {card.venue ?? ""}
        {card.year ? `, ${card.year}` : ""}
      </p>
      <div className="chips">
        <EvidenceChips atlas={atlas} card={card} />
      </div>
      {card.link ? (
        <p>
          <a href={card.link}>{t.readSource}</a>
          {card.doi ? (
            <>
              {" "}
              <span className="mono small muted">doi:{card.doi}</span>
            </>
          ) : null}
        </p>
      ) : null}
      {card.note ? <p className="notice">{oneLine(card.note)}</p> : null}

      <h2>{t.findings}</h2>
      <div className="card">
        {(card.finding ?? []).map((f, i) => (
          <div className="finding" key={i}>
            {f.metric ? (
              <div>
                <b>{atlas.metricName(f.metric)}</b>: {fmtValue(f.value, f.unit, lang)}
              </div>
            ) : null}
            {f.conditions ? <div className="small muted">{oneLine(f.conditions)}</div> : null}
            {f.quote ? <blockquote>{oneLine(f.quote)}</blockquote> : null}
          </div>
        ))}
      </div>

      <h2>{t.citedBy}</h2>
      {card.cited_by.length ? (
        <ul>
          {card.cited_by.map((id, i) => (
            <li key={`${id}-${i}`}>
              <TechLink atlas={atlas} id={id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">{t.notCited}</p>
      )}

      <p className="small muted" style={{ marginTop: "2rem" }}>
        {fill(t.added, { date: card.added || atlas.t.common.unknown, who: card.added_by || atlas.t.common.unknown })}
        {card.checked ? fill(t.checked, { date: card.checked }) : ""} &middot; <a href={card.source}>{atlas.t.common.sourceToml}</a>{" "}
        &middot; <a href={`${data.repository}/issues/new/choose`}>{t.report}</a>
      </p>
    </>
  );
}
