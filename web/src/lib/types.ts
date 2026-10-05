/* The shape of atlas.json, schema 1, as described in docs/export.md. Optional fields are the
   optional fields of the TOML files; derived fields are always present. atlas.<lang>.json has the
   same shape, with the texts translated and a `translation` status. */

export interface VocabularyItem {
  id: string;
  /** The value as a reader sees it: the id with spaces for hyphens, or its translation. */
  label: string;
  meaning: string;
}

/** How much of a page's text is translated, in a translated file only: counts of texts. */
export interface TranslationStatus {
  translated: number;
  total: number;
  machine: number;
  stale: number;
  reviewed_by: string[];
}

/** A published language of the atlas; English comes first. */
export interface Language {
  id: string;
  /** The BCP 47 tag the pages declare, such as "pt-BR". */
  tag: string;
  /** The language's name in the language itself. */
  name: string;
  english_name: string;
  maintainers: string[];
  /** The atlas file in the language, next to atlas.json: "atlas.json", "atlas.pt.json". */
  file: string;
  translation?: TranslationStatus;
}

export type VocabularyField =
  | "technology_status"
  | "gap_status"
  | "gap_type"
  | "layer"
  | "severity"
  | "evidence_class"
  | "evidence_status"
  | "evidence_type";

export interface Domain {
  id: string;
  name: string;
  summary: string;
  readiness_scale: string;
  sdgs?: number[];
  moderators: string[];
  openalex_fields?: number[];
  arxiv?: string[];
  pubmed?: boolean;
}

export interface MetricDefinition {
  id: string;
  name: string;
  meaning?: string;
  unit: string;
  direction?: "lower" | "higher";
  scale?: "log" | "linear";
  alan_machine?: string;
}

export interface ReadinessLevel {
  level: number;
  name: string;
  meaning?: string;
}

export interface ReadinessScale {
  id: string;
  name: string;
  summary?: string;
  source?: string;
  url?: string;
  level: ReadinessLevel[];
}

export interface Sdg {
  id: number;
  name: string;
}

export interface Taxonomy {
  domains: Domain[];
  metrics: MetricDefinition[];
  readiness_scales: ReadinessScale[];
  sdgs: Sdg[];
  vocabulary: Record<VocabularyField, VocabularyItem[]>;
}

export interface MetricDisplay {
  current: string | null;
  target: string | null;
  limit: string | null;
  gap_to_target: string | null;
  target_to_limit: string | null;
}

export interface Metric {
  id?: string;
  metric: string;
  headline?: boolean;
  conditions?: string;
  current?: { value: number; as_of?: string; evidence?: string; note?: string };
  target?: { value: number; rationale?: string; evidence?: string };
  limit?: { value: number; basis?: string; evidence?: string };
  history?: { value: number; as_of?: string; evidence?: string }[];
  gap_to_target: number | null;
  target_to_limit: number | null;
  display: MetricDisplay;
}

export interface Approach {
  name: string;
  readiness?: number;
  evidence?: string[];
}

export interface Gap {
  id: string;
  title: string;
  description?: string;
  metric?: string;
  type: string;
  layer: string;
  severity: string;
  status: string;
  blocked_by?: string[];
  evidence?: string[];
  search_terms?: string[];
  approach?: Approach[];
}

export interface Requirement {
  technology: string;
  why?: string;
  need?: string;
  metric?: string;
  value?: number;
}

export interface Block {
  technology: string;
  gap: string;
  title: string;
}

export interface AlanMachinePage {
  page: string;
  title: string;
  url: string;
}

export interface Technology {
  id: string;
  domain: string;
  name: string;
  statement: string;
  scope?: string;
  status: string;
  readiness?: number;
  readiness_scale?: string;
  readiness_evidence?: string[];
  readiness_note?: string;
  readiness_name: string;
  horizon?: string;
  last_reviewed?: string;
  sdgs?: number[];
  search_terms?: string[];
  curators?: string[];
  metrics: Metric[];
  gaps: Gap[];
  requires: Requirement[];
  required_by: Requirement[];
  blocks: Block[];
  dependents: string[];
  dependent_domains: string[];
  worst_open_severity: string | null;
  evidence: string[];
  source: string;
  page: string;
  alan_machine: AlanMachinePage[];
  translation?: TranslationStatus;
}

export interface Finding {
  metric?: string;
  value?: number;
  unit?: string;
  conditions?: string;
  quote?: string;
  /** Standard uncertainty (GUM, JCGM 100:2008), in the finding's unit. */
  uncertainty?: number;
  /** [low, high] as the source gives it, in the finding's unit; always with coverage. */
  interval?: [number, number];
  /** Probability of the interval, in (0, 1), such as 0.95. */
  coverage?: number;
}

export interface EvidenceCard {
  key: string;
  title: string;
  authors?: string[];
  year?: number;
  venue?: string;
  type: string;
  class: string;
  status: string;
  doi?: string;
  pmid?: string;
  arxiv?: string;
  nct?: string;
  url?: string;
  accessed?: string;
  added?: string;
  added_by?: string;
  checked?: string;
  note?: string;
  finding?: Finding[];
  link: string | null;
  cited_by: string[];
  source: string;
  translation?: TranslationStatus;
}

export interface AtlasData {
  schema: number;
  /** The language of the texts of this file ("en", "pt") and the tag the pages declare. */
  lang: string;
  tag: string;
  languages: Language[];
  translation?: TranslationStatus;
  name: string;
  description: string;
  version: string;
  version_date: string | null;
  license: { data: string; text: string; code: string; note: string };
  repository: string;
  site: string;
  alan_machine: string;
  governance?: { maintainers: string[]; url: string };
  taxonomy: Taxonomy;
  technologies: Technology[];
  evidence: EvidenceCard[];
}
