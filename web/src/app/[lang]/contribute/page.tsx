/* The contribute page in a translated edition; the page is views/ContributeView.tsx. */

import { ContributeView, contributeMetadata } from "@/views/ContributeView";
import { routeLang } from "@/views/route";

type Params = { params: Promise<{ lang: string }> };

export const dynamicParams = false;

export async function generateMetadata({ params }: Params) {
  return contributeMetadata(routeLang((await params).lang));
}

export default async function Page({ params }: Params) {
  return <ContributeView lang={routeLang((await params).lang)} />;
}
