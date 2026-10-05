/* The English route of a technology; the page is views/TechView.tsx. */

import { TechView, techMetadata, techParams } from "@/views/TechView";

type Params = { params: Promise<{ domain: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return techParams();
}

export async function generateMetadata({ params }: Params) {
  const { domain, slug } = await params;
  return techMetadata("en", domain, slug);
}

export default async function Page({ params }: Params) {
  const { domain, slug } = await params;
  return <TechView lang="en" domain={domain} slug={slug} />;
}
