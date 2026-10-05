/* What the community wants mapped next: the technologies ranked by the thumbs up on their
   Discussion in the "Priorities" category (decision 0016), read from priorities.json at build time.
   The ranking says nothing about the evidence, so this page shows no metric, status or card, and
   the rule that votes never change them sits above the table. */

import type { Metadata } from "next";

import { TechLink, TranslationNotice } from "@/components/ui";
import { fill, type Lang } from "@/i18n";
import { rich } from "@/i18n/rich";
import { loadAtlas, loadPriorities } from "@/lib/load";
import { pageMetadata } from "@/lib/site";

export function prioritiesMetadata(lang: Lang): Metadata {
  const t = loadAtlas(lang).t.priorities;
  return pageMetadata(lang, t.title, t.description, "/priorities/");
}

const cell = { padding: "6px 12px 6px 0", textAlign: "left", borderBottom: "1px solid var(--border)" } as const;

export function PrioritiesView({ lang }: { lang: Lang }) {
  const atlas = loadAtlas(lang);
  const t = atlas.t.priorities;
  const data = atlas.data;
  const count = loadPriorities();
  return (
    <div className="prose">
      <TranslationNotice atlas={atlas} status={data.translation} />
      <h1>{t.heading}</h1>
      <p className="lede">{t.lede}</p>
      <p className="notice">
        <b>{t.rule}</b>
      </p>
      {count ? (
        <>
          <p>
            {rich(t.counted, {
              date: count.counted_at.slice(0, 10),
              link: <a href={count.category_url}>{t.categoryLink}</a>,
            })}{" "}
            {fill(t.newAccounts, { days: count.min_account_age_days })}
          </p>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={cell}>{t.position}</th>
                <th style={cell}>{t.technology}</th>
                <th style={cell}>{t.votes}</th>
                <th style={cell}>{t.discussion}</th>
              </tr>
            </thead>
            <tbody>
              {count.technologies.map((row, i) => (
                <tr key={row.id}>
                  <td style={cell}>{i + 1}</td>
                  <td style={cell}>
                    <TechLink atlas={atlas} id={row.id} />
                  </td>
                  <td style={cell}>{row.votes}</td>
                  <td style={cell}>
                    <a href={row.discussion}>{t.vote}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p>{rich(t.pending, { link: <a href={`${data.repository}/discussions`}>{t.discussionsLink}</a> })}</p>
      )}
    </div>
  );
}
