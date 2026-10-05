/* The language-independent part of the interface strings: the default language and the template
   helpers. Kept apart from index.ts so that a client component can use them without bundling the
   dictionaries. */

import type { Lang } from "./index";

/** English: the source of every text, served at the root of the site. */
export const DEFAULT_LANG: Lang = "en";

/** A template with its {placeholders} replaced; an unknown placeholder is left as it is. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}

/** The singular or plural form of a template, filled with {n} and the other values. */
export function plural(forms: { one: string; other: string }, n: number, values: Record<string, string | number> = {}): string {
  return fill(n === 1 ? forms.one : forms.other, { n, ...values });
}
