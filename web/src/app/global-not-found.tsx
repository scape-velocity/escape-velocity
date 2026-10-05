/* Any address without a page. Exported as 404.html, which GitHub Pages serves for unknown paths.
   With two root layouts ((en) and [lang]) there is no layout to wrap a not-found page, so this one
   renders the whole English document itself (next.config.ts, experimental.globalNotFound). */

import type { Metadata } from "next";
import Link from "next/link";

import { Shell } from "@/components/Shell";
import { dictionary } from "@/i18n";
import { rich } from "@/i18n/rich";

const t = dictionary("en").notFound;

export const metadata: Metadata = { title: `${t.title} | Escape Velocity` };

export default function GlobalNotFound() {
  return (
    <Shell lang="en">
      <h1>{t.title}</h1>
      <p>{rich(t.text, { link: <Link href="/">{t.back}</Link> })}</p>
    </Shell>
  );
}
