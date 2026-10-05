/* What the [lang] routes share: the languages they generate and the check of their parameter. */

import { notFound } from "next/navigation";

import { DEFAULT_LANG, isLang, type Lang } from "@/i18n";
import { translatedLanguages } from "@/lib/load";

/** One { lang } per translated language, for generateStaticParams. */
export function langParams(): { lang: string }[] {
  return translatedLanguages().map((l) => ({ lang: l.id }));
}

/** The language of a /<id>/ route; English has no prefix, so /en/ is not a page. */
export function routeLang(id: string): Lang {
  if (!isLang(id) || id === DEFAULT_LANG) notFound();
  return id;
}
