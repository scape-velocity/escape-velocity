/* Paths of the pages, relative to the base path (next/link and the router add it). Safe on the
   server and in the browser. */

/** A technology page; its id is "<domain>/<slug>". */
export function techPath(id: string, gap?: string): string {
  return gap ? `/tech/${id}/?gap=${encodeURIComponent(gap)}` : `/tech/${id}/`;
}

export function cardPath(key: string): string {
  return `/evidence/${key}/`;
}

export function domainPath(id: string): string {
  return `/domain/${id}/`;
}
