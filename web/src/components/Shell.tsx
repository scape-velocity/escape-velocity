/* The document around every page, in one language: fonts, the scripts that run before the first
   paint, the header with the sections, the language switcher and the theme toggle, and the footer.
   Each root layout renders it ((en)/layout.tsx, [lang]/layout.tsx), and so does the global 404, so
   <html lang> is the page's language. */

import { Source_Code_Pro, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

import { type Lang } from "@/i18n";
import { rich } from "@/i18n/rich";
import { languageOf, loadAtlas, siteLanguages } from "@/lib/load";
import { localePath } from "@/lib/paths";
import { atlasFile, BASE_PATH, staticFile } from "@/lib/site";
import { THEME_KEY } from "@/lib/theme";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { Nav } from "./Nav";
import { ThemeToggle } from "./ThemeToggle";

import "@/app/globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});

const mono = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

/* Runs before the first paint: the stored theme, if any, so the page never flashes the other one. */
const themeScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

/* Old links of the hash-routed explorer: #/<path>?<query> goes to <base>/<path>/?<query>. */
const hashScript = `(function(){var h=location.hash;if(h.indexOf("#/")!==0)return;var s=h.slice(2),q="",i=s.indexOf("?");if(i>=0){q=s.slice(i);s=s.slice(0,i)}s=s.replace(/^\\/+|\\/+$/g,"");location.replace(${JSON.stringify(BASE_PATH)}+"/"+(s?s+"/":"")+q)})();`;

export function Shell({ lang, children }: { lang: Lang; children: ReactNode }) {
  const atlas = loadAtlas(lang);
  const data = atlas.data;
  const t = atlas.t.shell;
  const languages = siteLanguages().map((l) => ({ id: l.id, tag: l.tag, name: l.name }));
  return (
    <html lang={languageOf(lang).tag} className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: hashScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="alternate" type="application/json" href={atlasFile(lang)} title={atlas.t.site.jsonTitle} />
      </head>
      <body>
        <a className="skip" href="#main">
          {t.skip}
        </a>
        <header className="topbar">
          <div className="topbar-inner">
            <Link className="brand" href={localePath("/", lang)}>
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <circle cx="16" cy="16" r="13" />
                <path d="M9 22 L22 9 M15 9 h7 v7" />
              </svg>
              <span>Escape Velocity</span>
            </Link>
            <Nav lang={lang} labels={t.nav} label={t.sections} />
            <div className="topbar-tools">
              <a className="tool-link" href={data.alan_machine} title={t.alanMachineTitle}>
                The Alan Machine
              </a>
              <a className="tool-link" href={data.repository} title={t.githubTitle}>
                GitHub
              </a>
              <LanguageSwitcher lang={lang} languages={languages} label={t.languages} />
              <ThemeToggle label={t.theme} />
            </div>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="footer">
          <div className="footer-inner">
            <p id="footer-version">
              {rich(t.version, {
                version: (
                  <a href={`${data.repository}/commit/${data.version}`}>
                    <code>{data.version}</code>
                  </a>
                ),
                date: data.version_date ?? "",
              })}
            </p>
            <p>
              {rich(t.licenses, {
                data: <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a>,
                text: <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>,
                code: <a href="https://www.apache.org/licenses/LICENSE-2.0">Apache 2.0</a>,
              })}{" "}
              <a href={atlasFile(lang)}>{languageOf(lang).file}</a> &middot; <a href={staticFile("llms.txt")}>llms.txt</a> &middot;{" "}
              <Link href={localePath("/contribute/", lang)}>{t.contribute}</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
