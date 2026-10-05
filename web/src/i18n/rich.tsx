/* A template whose {placeholders} are elements (links, code), for the sentences of the interface
   that hold a link in the middle. Server and client safe. */

import { Fragment, type ReactNode } from "react";

export function rich(template: string, values: Record<string, ReactNode>): ReactNode {
  return template.split(/\{(\w+)\}/).map((part, i) => <Fragment key={i}>{i % 2 ? (values[part] ?? `{${part}}`) : part}</Fragment>);
}
