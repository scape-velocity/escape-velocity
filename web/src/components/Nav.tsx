"use client";

/* The section links of the header, with the active section marked as in site/app.js: a
   technology or a domain belongs to the overview, a card to the evidence. The links stay in the
   page language; the labels come from the server with it. */

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Dictionary, Lang } from "@/i18n";
import { englishPath, localePath } from "@/lib/paths";

const SECTIONS = [
  ["overview", "/"],
  ["graph", "/graph/"],
  ["gaps", "/gaps/"],
  ["evidence", "/evidence/"],
  ["about", "/about/"],
] as const;

function section(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0];
  if (!first || first === "tech" || first === "domain") return "overview";
  if (first === "graph" || first === "gaps" || first === "evidence" || first === "about") return first;
  return "";
}

export function Nav({ lang, labels, label }: { lang: Lang; labels: Dictionary["shell"]["nav"]; label: string }) {
  const active = section(englishPath(usePathname() ?? "", lang));
  return (
    <nav className="nav" aria-label={label}>
      {SECTIONS.map(([id, href]) => (
        <Link
          key={id}
          href={localePath(href, lang)}
          className={active === id ? "active" : undefined}
          aria-current={active === id ? "page" : undefined}
        >
          {labels[id]}
        </Link>
      ))}
    </nav>
  );
}
