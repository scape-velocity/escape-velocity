"use client";

/* The section links of the header, with the active section marked as in site/app.js: a
   technology or a domain belongs to the overview, a card to the evidence. */

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  ["overview", "/", "Overview"],
  ["graph", "/graph/", "Graph"],
  ["gaps", "/gaps/", "Gaps"],
  ["evidence", "/evidence/", "Evidence"],
  ["about", "/about/", "About"],
] as const;

function section(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0];
  if (!first || first === "tech" || first === "domain") return "overview";
  if (first === "graph" || first === "gaps" || first === "evidence" || first === "about") return first;
  return "";
}

export function Nav() {
  const active = section(usePathname() ?? "");
  return (
    <nav className="nav" aria-label="Sections">
      {SECTIONS.map(([id, href, label]) => (
        <Link key={id} href={href} className={active === id ? "active" : undefined} aria-current={active === id ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
