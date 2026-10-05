/* The atlas with its lookups (technologies, cards, domains, metrics, scales, vocabulary) and the
   helpers of the vanilla explorer that need them. Built once per build from atlas.json. */

import type {
  AtlasData,
  Domain,
  EvidenceCard,
  Gap,
  Metric,
  MetricDefinition,
  ReadinessScale,
  Technology,
  VocabularyField,
} from "./types";

export class Atlas {
  readonly data: AtlasData;
  readonly techs = new Map<string, Technology>();
  readonly cards = new Map<string, EvidenceCard>();
  readonly domains = new Map<string, Domain>();
  readonly metrics = new Map<string, MetricDefinition>();
  readonly scales = new Map<string, ReadinessScale>();
  readonly vocab: Record<string, Record<string, string>>;

  constructor(data: AtlasData) {
    this.data = data;
    data.technologies.forEach((t) => this.techs.set(t.id, t));
    data.evidence.forEach((c) => this.cards.set(c.key, c));
    data.taxonomy.domains.forEach((d) => this.domains.set(d.id, d));
    data.taxonomy.metrics.forEach((m) => this.metrics.set(m.id, m));
    data.taxonomy.readiness_scales.forEach((s) => this.scales.set(s.id, s));
    this.vocab = Object.fromEntries(
      Object.entries(data.taxonomy.vocabulary).map(([field, items]) => [
        field,
        Object.fromEntries(items.map((i) => [i.id, i.meaning])),
      ]),
    );
  }

  /** The meaning of a controlled value, for the title of its chip. */
  meaning(field: VocabularyField, id: string): string {
    return this.vocab[field]?.[id] ?? "";
  }

  /** The ids of a controlled field, in taxonomy order. */
  vocabIds(field: VocabularyField): string[] {
    return Object.keys(this.vocab[field] ?? {});
  }

  /** The name of a readiness level on the technology's scale, such as "TRL 4". */
  levelName(tech: Technology, level: number | null | undefined): string {
    if (level === undefined || level === null) return "not assessed";
    const domain = this.domains.get(tech.domain);
    const scale = this.scales.get(tech.readiness_scale ?? domain?.readiness_scale ?? "");
    if (!scale) return `level ${level}`;
    const found = (scale.level ?? []).find((item) => item.level === level);
    return found ? found.name : `level ${level}`;
  }

  metricName(id: string): string {
    return this.metrics.get(id)?.name ?? id;
  }

  techName(id: string): string {
    return this.techs.get(id)?.name ?? id;
  }

  sdgName(id: number): string | undefined {
    return this.data.taxonomy.sdgs.find((s) => s.id === id)?.name;
  }

  techsOf(domainId: string): Technology[] {
    return this.data.technologies.filter((t) => t.domain === domainId);
  }

  /** The governance page, for the "volunteer" links of empty roles. */
  governanceUrl(): string {
    return this.data.governance?.url ?? `${this.data.repository}/blob/main/GOVERNANCE.md`;
  }

  /** Every technology reachable from `id` through `requires` (down) or `required_by` (up). */
  transitive(id: string, direction: "down" | "up"): Set<string> {
    const seen = new Set<string>();
    const stack = [id];
    while (stack.length) {
      const tech = this.techs.get(stack.pop() as string);
      if (!tech) continue;
      const next = (direction === "down" ? tech.requires : tech.required_by).map((r) => r.technology);
      next.forEach((other) => {
        if (this.techs.has(other) && !seen.has(other) && other !== id) {
          seen.add(other);
          stack.push(other);
        }
      });
    }
    return seen;
  }
}

/** The metric marked as headline, shown for the technology in summaries. */
export function headline(tech: Technology): Metric | null {
  return tech.metrics.find((m) => m.headline) ?? null;
}

/** Gaps whose status is not closed. */
export function openGaps(tech: Technology): Gap[] {
  return tech.gaps.filter((g) => g.status !== "closed");
}
