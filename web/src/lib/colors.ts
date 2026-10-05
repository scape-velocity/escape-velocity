/* Domain colors, shared by the swatches, the bar chart and the graph. They are the same in both
   themes; everything else takes its color from the CSS tokens. */

const DOMAIN_COLORS: Record<string, string> = {
  computing: "#2780e3",
  quantum: "#7b4fd6",
  ai: "#d63384",
  health: "#e03131",
  biotech: "#2f9e44",
  neurotech: "#f76707",
  energy: "#e0a100",
  climate: "#0c9da8",
  materials: "#9c6b3f",
  water: "#4c6ef5",
  food: "#74b816",
  space: "#868e96",
  enablers: "#a61e4d",
};

export function domainColor(domainId: string): string {
  return DOMAIN_COLORS[domainId] ?? "#868e96";
}

export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
