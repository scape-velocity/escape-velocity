/* Every gap in a translated edition; the page is views/GapsView.tsx. */

import { GapsView, gapsMetadata } from "@/views/GapsView";
import { routeLang } from "@/views/route";

type Params = { params: Promise<{ lang: string }> };

export const dynamicParams = false;

export async function generateMetadata({ params }: Params) {
  return gapsMetadata(routeLang((await params).lang));
}

export default async function Page({ params }: Params) {
  return <GapsView lang={routeLang((await params).lang)} />;
}
