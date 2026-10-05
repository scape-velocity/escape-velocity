/* The English route of the overview; the page is views/OverviewView.tsx. */

import { OverviewView, overviewMetadata } from "@/views/OverviewView";

export function generateMetadata() {
  return overviewMetadata("en");
}

export default function Page() {
  return <OverviewView lang="en" />;
}
