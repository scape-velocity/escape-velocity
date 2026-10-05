/* A domain in a translated edition; the page is views/DomainView.tsx. The
   layout generates the languages and this route every id in each of them. */

import { DomainView, domainMetadata, domainParams } from "@/views/DomainView";
import { routeLang } from "@/views/route";

type Params = { params: Promise<{ lang: string; id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return domainParams();
}

export async function generateMetadata({ params }: Params) {
  const { lang, id } = await params;
  return domainMetadata(routeLang(lang), id);
}

export default async function Page({ params }: Params) {
  const { lang, id } = await params;
  return <DomainView lang={routeLang(lang)} id={id} />;
}
