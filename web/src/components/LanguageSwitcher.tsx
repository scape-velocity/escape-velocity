"use client";

/* Links to the same page in each other language, next to the theme toggle: /tech/x/y/ and
   /pt/tech/x/y/. The query string (?gap=, the filters) goes along; it is read after hydration, so
   the static HTML links to the page without it. */

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import type { Lang } from "@/i18n";
import { englishPath, localePath } from "@/lib/paths";

export interface SwitcherLanguage {
  id: Lang;
  tag: string;
  name: string;
}

interface Props {
  lang: Lang;
  languages: SwitcherLanguage[];
  label: string;
}

function Links({ lang, languages, label, query }: Props & { query: string }) {
  const page = englishPath(usePathname() ?? "/", lang);
  const others = languages.filter((l) => l.id !== lang);
  if (!others.length) return null;
  return (
    <nav className="lang-switch" aria-label={label}>
      {others.map((l) => (
        <Link key={l.id} className="lang-link" href={`${localePath(page, l.id)}${query}`} hrefLang={l.tag} lang={l.tag}>
          {l.name}
        </Link>
      ))}
    </nav>
  );
}

function LinksWithQuery(props: Props) {
  const query = useSearchParams().toString();
  return <Links {...props} query={query ? `?${query}` : ""} />;
}

export function LanguageSwitcher(props: Props) {
  return (
    <Suspense fallback={<Links {...props} query="" />}>
      <LinksWithQuery {...props} />
    </Suspense>
  );
}
