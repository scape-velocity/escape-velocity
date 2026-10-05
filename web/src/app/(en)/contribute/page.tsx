/* The English route of the contribute page; the page is views/ContributeView.tsx. */

import { ContributeView, contributeMetadata } from "@/views/ContributeView";

export function generateMetadata() {
  return contributeMetadata("en");
}

export default function Page() {
  return <ContributeView lang="en" />;
}
