/* One evidence card: source, findings with their quotes, and the technologies that cite it. A port
   of cardView() in site/app.js. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlainChip, TechLink } from "@/components/ui";
import { fmtValue, oneLine } from "@/lib/format";
import { loadAtlas } from "@/lib/load";
import { cardPath } from "@/lib/paths";
import { pageMetadata } from "@/lib/site";

type Params = { params: Promise<{ key: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return loadAtlas().data.evidence.map((c) => ({ key: c.key }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { key } = await params;
  const card = loadAtlas().cards.get(key);
  if (!card) return {};
  return pageMetadata(card.title, card.title, cardPath(card.key));
}

export default async function CardPage({ params }: Params) {
  const { key } = await params;
  const atlas = loadAtlas();
  const data = atlas.data;
  const card = atlas.cards.get(key);
  if (!card) notFound();
  return (
    <>
      <p className="eyebrow">
        <Link href="/evidence/">Evidence</Link> / <span className="mono">{card.key}</span>
      </p>
      <h1>{card.title}</h1>
      <p className="muted">
        {(card.authors ?? []).join(", ")}
        <br />
        {card.venue ?? ""}
        {card.year ? `, ${card.year}` : ""}
      </p>
      <div className="chips">
        <PlainChip text={card.class} title={atlas.meaning("evidence_class", card.class)} />
        <PlainChip text={card.status} title={atlas.meaning("evidence_status", card.status)} />
        <PlainChip text={card.type} title={atlas.meaning("evidence_type", card.type)} />
      </div>
      {card.link ? (
        <p>
          <a href={card.link}>Read the source</a>
          {card.doi ? (
            <>
              {" "}
              <span className="mono small muted">doi:{card.doi}</span>
            </>
          ) : null}
        </p>
      ) : null}
      {card.note ? <p className="notice">{oneLine(card.note)}</p> : null}

      <h2>Findings</h2>
      <div className="card">
        {(card.finding ?? []).map((f, i) => (
          <div className="finding" key={i}>
            {f.metric ? (
              <div>
                <b>{atlas.metricName(f.metric)}</b>: {fmtValue(f.value, f.unit)}
              </div>
            ) : null}
            {f.conditions ? <div className="small muted">{oneLine(f.conditions)}</div> : null}
            {f.quote ? <blockquote>{oneLine(f.quote)}</blockquote> : null}
          </div>
        ))}
      </div>

      <h2>Cited by</h2>
      {card.cited_by.length ? (
        <ul>
          {card.cited_by.map((id, i) => (
            <li key={`${id}-${i}`}>
              <TechLink atlas={atlas} id={id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">No technology cites this card yet.</p>
      )}

      <p className="small muted" style={{ marginTop: "2rem" }}>
        Added {card.added || "?"} by {card.added_by || "?"}
        {card.checked ? `, checked ${card.checked}` : ""} &middot; <a href={card.source}>Source TOML</a> &middot;{" "}
        <a href={`${data.repository}/issues/new/choose`}>Report a problem</a>
      </p>
    </>
  );
}
