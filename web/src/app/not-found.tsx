/* Any address without a page. Exported as 404.html, which GitHub Pages serves for unknown paths. */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p>
        Nothing at this address. <Link href="/">Back to the overview</Link>.
      </p>
    </>
  );
}
