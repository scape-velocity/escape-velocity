/* The dependency graph in a translated edition; the page is views/GraphView.tsx. */

import { GraphView, graphMetadata } from "@/views/GraphView";
import { routeLang } from "@/views/route";

type Params = { params: Promise<{ lang: string }> };

export const dynamicParams = false;

export async function generateMetadata({ params }: Params) {
  return graphMetadata(routeLang((await params).lang));
}

export default async function Page({ params }: Params) {
  return <GraphView lang={routeLang((await params).lang)} />;
}
