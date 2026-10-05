/* The English route of the about page; the page is views/AboutView.tsx. */

import { AboutView, aboutMetadata } from "@/views/AboutView";

export function generateMetadata() {
  return aboutMetadata("en");
}

export default function Page() {
  return <AboutView lang="en" />;
}
