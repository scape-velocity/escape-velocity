import type { Metadata } from "next";
import { Source_Code_Pro, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

import { Nav } from "@/components/Nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { loadAtlas } from "@/lib/load";
import { BASE_PATH, SITE_DESCRIPTION, staticFile } from "@/lib/site";
import { THEME_KEY } from "@/lib/theme";

import "./globals.css";

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

export const metadata: Metadata = {
  title: { default: "Escape Velocity", template: "%s | Escape Velocity" },
  description: SITE_DESCRIPTION,
};

/* Runs before the first paint: the stored theme, if any, so the page never flashes the other one. */
const themeScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

/* Old links of the hash-routed explorer: #/<path>?<query> goes to <base>/<path>/?<query>. */
const hashScript = `(function(){var h=location.hash;if(h.indexOf("#/")!==0)return;var s=h.slice(2),q="",i=s.indexOf("?");if(i>=0){q=s.slice(i);s=s.slice(0,i)}s=s.replace(/^\\/+|\\/+$/g,"");location.replace(${JSON.stringify(BASE_PATH)}+"/"+(s?s+"/":"")+q)})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  const data = loadAtlas().data;
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: hashScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="alternate" type="application/json" href={staticFile("atlas.json")} title="The atlas as JSON" />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header className="topbar">
          <div className="topbar-inner">
            <Link className="brand" href="/">
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <circle cx="16" cy="16" r="13" />
                <path d="M9 22 L22 9 M15 9 h7 v7" />
              </svg>
              <span>Escape Velocity</span>
            </Link>
            <Nav />
            <div className="topbar-tools">
              <a className="tool-link" href={data.alan_machine} title="The Alan Machine, the companion book">
                The Alan Machine
              </a>
              <a className="tool-link" href={data.repository} title="Source on GitHub">
                GitHub
              </a>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="footer">
          <div className="footer-inner">
            <p id="footer-version">
              Atlas version{" "}
              <a href={`${data.repository}/commit/${data.version}`}>
                <code>{data.version}</code>
              </a>
              , {data.version_date}. Every number links to its source.
            </p>
            <p>
              Data <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a>, text{" "}
              <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, code{" "}
              <a href="https://www.apache.org/licenses/LICENSE-2.0">Apache 2.0</a>. <a href={staticFile("atlas.json")}>atlas.json</a>{" "}
              &middot; <a href={staticFile("llms.txt")}>llms.txt</a> &middot;{" "}
              <a href={`${data.repository}/blob/main/CONTRIBUTING.md`}>Contribute</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
