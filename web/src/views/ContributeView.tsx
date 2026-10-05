/* How to take part, for a reader who does not use git: what can be contributed, the issue forms
   and the pull request in a few steps. The rules that change (titles, sign-off, evidence policy)
   stay in CONTRIBUTING.md, which this page links to instead of repeating. */

import type { Metadata } from "next";

import { TranslationNotice } from "@/components/ui";
import type { Lang } from "@/i18n";
import { rich } from "@/i18n/rich";
import { loadAtlas } from "@/lib/load";
import { pageMetadata } from "@/lib/site";

/** The files in .github/ISSUE_TEMPLATE/, in the order the page lists them. */
const FORMS = ["report-evidence", "challenge-value", "propose-technology", "translation"] as const;

export function contributeMetadata(lang: Lang): Metadata {
  const t = loadAtlas(lang).t.contribute;
  return pageMetadata(lang, t.title, t.description, "/contribute/");
}

export function ContributeView({ lang }: { lang: Lang }) {
  const atlas = loadAtlas(lang);
  const t = atlas.t.contribute;
  const data = atlas.data;
  return (
    <div className="prose">
      <TranslationNotice atlas={atlas} status={data.translation} />
      <h1>{t.heading}</h1>
      <p className="lede">{t.lede}</p>
      <h2>{t.what}</h2>
      <ul>
        {t.whatItems.map((item) => (
          <li key={item.term}>
            <b>{item.term}</b> {item.text}
          </li>
        ))}
      </ul>
      <p>{t.whatSource}</p>
      <h2>{t.forms}</h2>
      <p>{t.formsText}</p>
      <ul>
        {FORMS.map((id) => (
          <li key={id}>
            <a href={`${data.repository}/issues/new?template=${id}.yml`}>{t.formItems[id].name}</a>: {t.formItems[id].text}
          </li>
        ))}
      </ul>
      <p>{rich(t.discussions, { link: <a href={`${data.repository}/discussions`}>{t.discussionsLink}</a> })}</p>
      <h2>{t.pr}</h2>
      <p>{t.prText}</p>
      <ol>
        {t.prSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p>{rich(t.rules, { link: <a href={`${data.repository}/blob/main/CONTRIBUTING.md`}>{t.rulesLink}</a> })}</p>
      <p>{rich(t.roles, { link: <a href={atlas.governanceUrl()}>GOVERNANCE.md</a> })}</p>
    </div>
  );
}
