/* The English route of the priorities page; the page is views/PrioritiesView.tsx. */

import { PrioritiesView, prioritiesMetadata } from "@/views/PrioritiesView";

export function generateMetadata() {
  return prioritiesMetadata("en");
}

export default function Page() {
  return <PrioritiesView lang="en" />;
}
