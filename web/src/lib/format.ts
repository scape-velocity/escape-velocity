/* Text and number helpers ported from the vanilla explorer (site/app.js). Pure functions, safe on
   the server and in the browser. */

import type { EvidenceCard } from "./types";

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
};

function superscript(text: string): string {
  return text
    .split("")
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join("");
}

/** Whitespace collapsed to single spaces. */
export function oneLine(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** The first sentence of a text, or the whole text on one line when it has no sentence end. */
export function firstSentence(text: string | null | undefined): string {
  const line = oneLine(text);
  const match = line.match(/^(.+?[.!?])(\s|$)/);
  return match ? match[1] : line;
}

/** Paragraphs separated by blank lines, each on one line. */
export function paragraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, " "));
}

/** A number as the pages show it: grouped integers, or a mantissa and a superscript exponent. */
export function fmtNumber(value: unknown): string {
  if (typeof value !== "number") return String(value);
  if (Number.isInteger(value) && Math.abs(value) < 1e6) return value.toLocaleString("en-US").replace(/,/g, " ");
  if (value === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  if (exponent >= -3 && exponent <= 5) return String(Number(value.toPrecision(6)));
  const mantissa = Number((value / 10 ** exponent).toPrecision(3));
  const sup = superscript(String(exponent));
  return mantissa === 1 ? `10${sup}` : `${mantissa} × 10${sup}`;
}

/** Unit exponents as superscripts: "USD kg^-1" becomes "USD kg⁻¹". */
export function prettyUnit(unit: string): string {
  return unit.replace(/\^(-?\d+)/g, (_, exp: string) => superscript(exp));
}

/** A value with its unit, or an en dash when there is none. */
export function fmtValue(value: number | null | undefined, unit: string | null | undefined): string {
  if (value === null || value === undefined) return "–";
  const number = fmtNumber(value);
  if (!unit || unit === "1") return number;
  if (unit === "%") return `${number}%`;
  return `${number} ${prettyUnit(unit)}`;
}

/** "First et al." for three or more authors, "First and Second" for two. */
export function authorsShort(card: EvidenceCard): string {
  const authors = card.authors ?? [];
  if (!authors.length) return "";
  return authors.length > 2 ? `${authors[0]} et al.` : authors.join(" and ");
}
