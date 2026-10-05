/* The priorities page in a translated edition; the page is views/PrioritiesView.tsx. */

import { PrioritiesView, prioritiesMetadata } from "@/views/PrioritiesView";
import { routeLang } from "@/views/route";

type Params = { params: Promise<{ lang: string }> };

export const dynamicParams = false;

export async function generateMetadata({ params }: Params) {
  return prioritiesMetadata(routeLang((await params).lang));
}

export default async function Page({ params }: Params) {
  return <PrioritiesView lang={routeLang((await params).lang)} />;
}
