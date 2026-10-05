/* Every evidence card in a translated edition; the page is views/EvidenceView.tsx. */

import { EvidenceView, evidenceMetadata } from "@/views/EvidenceView";
import { routeLang } from "@/views/route";

type Params = { params: Promise<{ lang: string }> };

export const dynamicParams = false;

export async function generateMetadata({ params }: Params) {
  return evidenceMetadata(routeLang((await params).lang));
}

export default async function Page({ params }: Params) {
  return <EvidenceView lang={routeLang((await params).lang)} />;
}
