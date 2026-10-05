/* The ladder of a metric: now, target and limit on one axis, better to the right. A port of
   ladder() in site/app.js; colors are CSS tokens, so it follows the theme. */

import type { ReactNode } from "react";

import type { Metric, MetricDefinition } from "@/lib/types";

export function Ladder({ metric, def }: { metric: Metric; def: Partial<MetricDefinition> & { name: string } }) {
  const log = def.scale === "log";
  const lower = def.direction === "lower";
  const points = (
    [
      ["now", metric.current?.value],
      ["target", metric.target?.value],
      ["limit", metric.limit?.value],
    ] as [string, number | undefined][]
  ).filter((p): p is [string, number] => typeof p[1] === "number" && (!log || p[1] > 0));
  if (!points.length) return null;
  const f = (v: number) => (log ? Math.log10(v) : v);
  let min = Math.min(...points.map(([, v]) => f(v)));
  let max = Math.max(...points.map(([, v]) => f(v)));
  if (max - min < 1e-9) {
    const spread = log ? 1 : Math.abs(min) * 0.2 || 1;
    min -= spread;
    max += spread;
  }
  const pad = (max - min) * 0.1;
  min -= pad;
  max += pad;
  const L = 12;
  const R = 348;
  const Y = 34;
  const x = (v: number) => {
    let t = (f(v) - min) / (max - min);
    if (lower) t = 1 - t;
    return L + t * (R - L);
  };
  const byName: Record<string, number> = Object.fromEntries(points);
  const ticks: number[] = [];
  if (log && max - min <= 40) {
    const step = max - min > 16 ? 2 : 1;
    for (let e = Math.ceil(min); e <= Math.floor(max); e += step) ticks.push(x(10 ** e));
  } else if (!log) {
    const span = max - min;
    const step = span > 60 ? 20 : span > 20 ? 10 : span > 5 ? 1 : span / 5;
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(x(v));
  }
  const met = metric.gap_to_target !== null && metric.gap_to_target !== undefined && metric.gap_to_target <= 0;
  const accent = met ? "var(--ok)" : "var(--accent)";
  const anchor = (px: number) => (px < 40 ? "start" : px > 320 ? "end" : "middle");
  const n = (v: number) => v.toFixed(1);
  const parts: ReactNode[] = [];
  parts.push(
    <line key="axis" x1={L} y1={Y} x2={R} y2={Y} style={{ stroke: "var(--border-strong)" }} strokeWidth={2} strokeLinecap="round" />,
  );
  ticks.forEach((t, i) =>
    parts.push(
      <line key={`tick-${i}`} x1={n(t)} y1={Y - 4} x2={n(t)} y2={Y + 4} style={{ stroke: "var(--border-strong)" }} strokeWidth={1} />,
    ),
  );
  if ("now" in byName && "target" in byName) {
    parts.push(
      <line
        key="gap"
        x1={n(x(byName.now))}
        y1={Y}
        x2={n(x(byName.target))}
        y2={Y}
        style={{ stroke: accent }}
        strokeWidth={5}
        strokeLinecap="round"
      />,
    );
  }
  if ("target" in byName && "limit" in byName) {
    parts.push(
      <line
        key="room"
        x1={n(x(byName.target))}
        y1={Y}
        x2={n(x(byName.limit))}
        y2={Y}
        style={{ stroke: "var(--faint)" }}
        strokeWidth={2}
        strokeDasharray="4 4"
      />,
    );
  }
  if ("limit" in byName) {
    const px = x(byName.limit);
    parts.push(<line key="limit" x1={n(px)} y1={Y - 10} x2={n(px)} y2={Y + 10} style={{ stroke: "var(--text)" }} strokeWidth={2} />);
    const near = "target" in byName && Math.abs(px - x(byName.target)) < 50;
    parts.push(
      <text key="limit-label" x={n(px)} y={near ? Y + 26 : Y - 16} textAnchor={anchor(px)}>
        limit
      </text>,
    );
  }
  if ("target" in byName) {
    const px = x(byName.target);
    parts.push(
      <rect
        key="target"
        x={n(px - 6)}
        y={Y - 6}
        width={12}
        height={12}
        transform={`rotate(45 ${n(px)} ${Y})`}
        style={{ fill: "var(--surface)", stroke: accent }}
        strokeWidth={2.5}
      />,
    );
    parts.push(
      <text key="target-label" className="val" x={n(px)} y={Y - 16} textAnchor={anchor(px)}>
        target
      </text>,
    );
  }
  if ("now" in byName) {
    const px = x(byName.now);
    parts.push(
      <circle key="now" cx={n(px)} cy={Y} r={6.5} style={{ fill: "var(--text)", stroke: "var(--surface)" }} strokeWidth={2} />,
    );
    parts.push(
      <text key="now-label" className="val" x={n(px)} y={Y + 26} textAnchor={anchor(px)}>
        now
      </text>,
    );
  }
  const label = `${def.name}: ${log ? "log scale, one tick per order of magnitude" : "linear scale"}; better to the right`;
  return (
    <svg className="ladder" viewBox="0 0 360 64" role="img" aria-label={label}>
      <title>{label}</title>
      {parts}
    </svg>
  );
}
