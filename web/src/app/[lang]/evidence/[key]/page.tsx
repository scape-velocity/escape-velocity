/* An evidence card in a translated edition; the page is views/CardView.tsx. The
   layout generates the languages and this route every key in each of them. */

import { CardView, cardMetadata, cardParams } from "@/views/CardView";
import { routeLang } from "@/views/route";

type Params = { params: Promise<{ lang: string; key: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return cardParams();
}

export async function generateMetadata({ params }: Params) {
  const { lang, key } = await params;
  return cardMetadata(routeLang(lang), key);
}

export default async function Page({ params }: Params) {
  const { lang, key } = await params;
  return <CardView lang={routeLang(lang)} cardKey={key} />;
}
