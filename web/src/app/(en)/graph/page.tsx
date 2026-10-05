/* The English route of the dependency graph; the page is views/GraphView.tsx. */

import { GraphView, graphMetadata } from "@/views/GraphView";

export function generateMetadata() {
  return graphMetadata("en");
}

export default function Page() {
  return <GraphView lang="en" />;
}
