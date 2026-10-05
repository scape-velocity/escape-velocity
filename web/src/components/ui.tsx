/* Small pieces shared by the pages, ported from the helpers of site/app.js (chip, statusChip,
   severityChip, plainChip, techLink, evidenceLinks, people, paragraphs), and the notice of a
   translated page. Server components; they render in the language of the atlas they receive. */

import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";

import { domainColor } from "@/lib/colors";
import { paragraphs } from "@/lib/format";
import type { Atlas } from "@/lib/model";
import { cardPath, techPath } from "@/lib/paths";
import type { TranslationStatus } from "@/lib/types";

export function Chip({ text, cls, title }: { text: ReactNode; cls?: string; title?: string }) {
  return (
    <span className={`chip dot ${cls ?? ""}`} title={title || undefined}>
      {text}
    </span>
  );
}

export function PlainChip({ text, title }: { text: ReactNode; title?: string }) {
  return (
    <span className="chip" title={title || undefined}>
      {text}
    </span>
  );
}

export function StatusChip({ atlas, status }: { atlas: Atlas; status: string }) {
  return <Chip text={atlas.label("technology_status", status)} cls={`status-${status}`} title={atlas.meaning("technology_status", status)} />;
}

export function SeverityChip({ atlas, severity }: { atlas: Atlas; severity: string }) {
  return <Chip text={atlas.label("severity", severity)} cls={`sev-${severity}`} title={atlas.meaning("severity", severity)} />;
}

export function Swatch({ domain, style }: { domain: string; style?: CSSProperties }) {
  return <span className="domain-swatch" style={{ "--d": domainColor(domain), ...style } as CSSProperties} />;
}

/** A link to a technology, or its id in monospace when it is not in the atlas. */
export function TechLink({ atlas, id }: { atlas: Atlas; id: string }) {
  const tech = atlas.techs.get(id);
  return tech ? <Link href={techPath(tech.id, undefined, atlas.lang)}>{tech.name}</Link> : <span className="mono">{id}</span>;
}

/** Technology links separated by commas. */
export function TechLinks({ atlas, ids }: { atlas: Atlas; ids: string[] }) {
  return (
    <>
      {ids.map((id, i) => (
        <Fragment key={id}>
          {i ? ", " : ""}
          <TechLink atlas={atlas} id={id} />
        </Fragment>
      ))}
    </>
  );
}

export function EvidenceLinks({ atlas, keys }: { atlas: Atlas; keys?: string[] }) {
  if (!keys || !keys.length) return null;
  return (
    <div className="evidence-links">
      {keys.map((key, i) => (
        <Link key={`${key}-${i}`} href={cardPath(key, atlas.lang)} title={atlas.cards.get(key)?.title ?? key}>
          {key}
        </Link>
      ))}
    </div>
  );
}

/** GitHub handles as profile links, or a link to volunteer for the role (GOVERNANCE.md). */
export function People({ atlas, handles, role }: { atlas: Atlas; handles?: string[]; role: string }) {
  if (!handles || !handles.length) {
    return (
      <>
        {atlas.t.common.noneYet} <a href={`${atlas.governanceUrl()}#${role}`}>{atlas.t.common.volunteer}</a>
      </>
    );
  }
  return (
    <>
      {handles.map((name, i) => (
        <Fragment key={name}>
          {i ? ", " : ""}
          <a href={`https://github.com/${name}`}>@{name}</a>
        </Fragment>
      ))}
    </>
  );
}

export function Paragraphs({ text }: { text?: string | null }) {
  return (
    <>
      {paragraphs(text).map((block, i) => (
        <p key={i}>{block}</p>
      ))}
    </>
  );
}

/** On a translated page: whether a machine translated it and whether part of it is still in
    English, with a link to the guide for translators. Nothing on an English page. */
export function TranslationNotice({ atlas, status }: { atlas: Atlas; status?: TranslationStatus }) {
  if (!status) return null;
  const machine = status.machine > 0;
  const partial = status.translated < status.total;
  if (!machine && !partial) return null;
  const t = atlas.t.notice;
  return (
    <p className="notice" role="note">
      {machine ? `${t.machine} ` : ""}
      {partial ? `${t.partial} ` : ""}
      <a href={`${atlas.data.repository}/blob/main/docs/translating.md`}>{t.help}</a>
    </p>
  );
}
