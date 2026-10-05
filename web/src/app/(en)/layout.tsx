/* The root layout of the English pages, at the root of the site. The page bodies are in src/views;
   [lang]/layout.tsx is the same document in another language. */

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Shell } from "@/components/Shell";
import { dictionary } from "@/i18n";

export const metadata: Metadata = {
  title: { default: "Escape Velocity", template: "%s | Escape Velocity" },
  description: dictionary("en").site.description,
};

export default function EnglishLayout({ children }: { children: ReactNode }) {
  return <Shell lang="en">{children}</Shell>;
}
