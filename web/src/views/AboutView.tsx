/* What the atlas is, how to use its data, how to cite and how to take part (the details are on
   the contribute page). A port of aboutView() in site/app.js, with the governance people of the
   atlas. */

import type { Metadata } from "next";
import Link from "next/link";

import { TranslationNotice } from "@/components/ui";
import type { Lang } from "@/i18n";
import { rich } from "@/i18n/rich";
import { languageOf, loadAtlas } from "@/lib/load";
import { localePath } from "@/lib/paths";
import { atlasFile, pageMetadata, staticFile } from "@/lib/site";

export function aboutMetadata(lang: Lang): Metadata {
  const t = loadAtlas(lang).t.about;
  return pageMetadata(lang, t.title, t.description, "/about/");
}

export function AboutView({ lang }: { lang: Lang }) {
  const atlas = loadAtlas(lang);
  const t = atlas.t.about;
  const data = atlas.data;
  const file = languageOf(lang).file;
  return (
    <div className="prose">
      <TranslationNotice atlas={atlas} status={data.translation} />
      <h1>{t.heading}</h1>
      <p className="lede">{t.lede}</p>
      <h2>{t.model}</h2>
      <ul>
        {t.modelItems.map((item) => (
          <li key={item.term}>
            <b>{item.term}</b> {item.text}
          </li>
        ))}
      </ul>
      <p>{rich(t.modelMore, { link: <a href={`${data.repository}/blob/main/docs/model.md`}>docs/model.md</a> })}</p>
      <h2>{t.data}</h2>
      <ul>
        <li>
          {rich(t.dataJson, {
            file: <a href={atlasFile(lang)}>{file}</a>,
            format: <a href={`${data.repository}/blob/main/docs/export.md`}>{t.dataFormat}</a>,
          })}
        </li>
        <li>
          {rich(t.dataLlms, {
            llms: <a href={staticFile("llms.txt")}>llms.txt</a>,
            full: <a href={staticFile("llms-full.txt")}>llms-full.txt</a>,
          })}
        </li>
        <li>
          {rich(t.dataMcp, { file: <a href={`${data.repository}/blob/main/tools/mcp_server.py`}>tools/mcp_server.py</a> })}
        </li>
      </ul>
      <h2>{t.cite}</h2>
      <p>
        {rich(t.citeText, {
          version: (
            <a href={`${data.repository}/commit/${data.version}`}>
              <code>{data.version}</code>
            </a>
          ),
          date: data.version_date ?? "",
          cff: <a href={`${data.repository}/blob/main/CITATION.cff`}>CITATION.cff</a>,
        })}
      </p>
      <h2>{t.contribute}</h2>
      <p>{rich(t.contributeText, { link: <Link href={localePath("/contribute/", lang)}>{t.contributeLink}</Link> })}</p>
      <p>{rich(t.rolesText, { link: <a href={atlas.governanceUrl()}>GOVERNANCE.md</a> })}</p>
      <h2>{t.alanMachine}</h2>
      <p>{rich(t.alanMachineText, { link: <a href={data.alan_machine}>The Alan Machine</a> })}</p>
      <p className="small muted">{t.outOfScope}</p>
    </div>
  );
}
