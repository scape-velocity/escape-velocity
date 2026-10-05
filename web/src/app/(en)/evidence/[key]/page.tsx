/* The English route of an evidence card; the page is views/CardView.tsx. */

import { CardView, cardMetadata, cardParams } from "@/views/CardView";

type Params = { params: Promise<{ key: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return cardParams();
}

export async function generateMetadata({ params }: Params) {
  const { key } = await params;
  return cardMetadata("en", key);
}

export default async function Page({ params }: Params) {
  const { key } = await params;
  return <CardView lang="en" cardKey={key} />;
}
