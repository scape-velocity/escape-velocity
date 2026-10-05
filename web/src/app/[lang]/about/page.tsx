/* The about page in a translated edition; the page is views/AboutView.tsx. */

import { AboutView, aboutMetadata } from "@/views/AboutView";
import { routeLang } from "@/views/route";

type Params = { params: Promise<{ lang: string }> };

export const dynamicParams = false;

export async function generateMetadata({ params }: Params) {
  return aboutMetadata(routeLang((await params).lang));
}

export default async function Page({ params }: Params) {
  return <AboutView lang={routeLang((await params).lang)} />;
}
