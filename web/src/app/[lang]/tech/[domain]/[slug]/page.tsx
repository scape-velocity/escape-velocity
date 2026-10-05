/* A technology in a translated edition; the page is views/TechView.tsx. The
   layout generates the languages and this route every domain, slug in each of them. */

import { TechView, techMetadata, techParams } from "@/views/TechView";
import { routeLang } from "@/views/route";

type Params = { params: Promise<{ lang: string; domain: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return techParams();
}

export async function generateMetadata({ params }: Params) {
  const { lang, domain, slug } = await params;
  return techMetadata(routeLang(lang), domain, slug);
}

export default async function Page({ params }: Params) {
  const { lang, domain, slug } = await params;
  return <TechView lang={routeLang(lang)} domain={domain} slug={slug} />;
}
