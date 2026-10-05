/* The English route of every evidence card; the page is views/EvidenceView.tsx. */

import { EvidenceView, evidenceMetadata } from "@/views/EvidenceView";

export function generateMetadata() {
  return evidenceMetadata("en");
}

export default function Page() {
  return <EvidenceView lang="en" />;
}
