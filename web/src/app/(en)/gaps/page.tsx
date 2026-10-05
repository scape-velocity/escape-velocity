/* The English route of every gap; the page is views/GapsView.tsx. */

import { GapsView, gapsMetadata } from "@/views/GapsView";

export function generateMetadata() {
  return gapsMetadata("en");
}

export default function Page() {
  return <GapsView lang="en" />;
}
