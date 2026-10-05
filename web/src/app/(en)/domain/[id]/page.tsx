/* The English route of a domain; the page is views/DomainView.tsx. */

import { DomainView, domainMetadata, domainParams } from "@/views/DomainView";

type Params = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return domainParams();
}

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  return domainMetadata("en", id);
}

export default async function Page({ params }: Params) {
  const { id } = await params;
  return <DomainView lang="en" id={id} />;
}
