/* The overview in a translated edition; the page is views/OverviewView.tsx. */

import { OverviewView, overviewMetadata } from "@/views/OverviewView";
import { routeLang } from "@/views/route";

type Params = { params: Promise<{ lang: string }> };

export const dynamicParams = false;

export async function generateMetadata({ params }: Params) {
  return overviewMetadata(routeLang((await params).lang));
}

export default async function Page({ params }: Params) {
  return <OverviewView lang={routeLang((await params).lang)} />;
}
