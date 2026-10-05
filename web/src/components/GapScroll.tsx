"use client";

/* Scrolls a technology page to the gap named in ?gap=<id>, as site/app.js did after rendering. */

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function GapScroll() {
  const gap = useSearchParams().get("gap");
  useEffect(() => {
    if (!gap) return;
    const target = document.getElementById(`gap-${gap}`);
    if (!target) return;
    const timer = window.setTimeout(() => target.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
    return () => window.clearTimeout(timer);
  }, [gap]);
  return null;
}
