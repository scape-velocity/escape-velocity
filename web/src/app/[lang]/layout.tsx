/* The root layout of a translated edition, under /<id>/: one per language with an atlas.<id>.json
   and interface strings (src/i18n). Its pages are the English views rendered in the language. */

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Shell } from "@/components/Shell";
import { dictionary } from "@/i18n";
import { langParams, routeLang } from "@/views/route";

type Params = { params: Promise<{ lang: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return langParams();
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: { default: "Escape Velocity", template: "%s | Escape Velocity" },
    description: dictionary(routeLang(lang)).site.description,
  };
}

export default async function LanguageLayout({ children, params }: Params & { children: ReactNode }) {
  const { lang } = await params;
  return <Shell lang={routeLang(lang)}>{children}</Shell>;
}
