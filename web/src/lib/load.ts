/* Reads atlas.json at build time. Server only: imported by pages and layouts, never by a client
   component. The file is written by `python3 tools/build_site.py` (docs/export.md). */

import { readFileSync } from "node:fs";
import path from "node:path";

import { Atlas } from "./model";
import type { AtlasData } from "./types";

let cached: Atlas | null = null;

/** The path of atlas.json: ATLAS_JSON, or ../_site/atlas.json relative to web/. */
export function atlasPath(): string {
  return path.resolve(process.cwd(), process.env.ATLAS_JSON ?? "../_site/atlas.json");
}

export function loadAtlas(): Atlas {
  if (cached) return cached;
  const file = atlasPath();
  let text: string;
  try {
    text = readFileSync(file, "utf-8");
  } catch {
    throw new Error(
      `atlas.json not found at ${file}. Run \`python3 tools/build_site.py\` from the repository root first, ` +
        "or point ATLAS_JSON at the file.",
    );
  }
  const data = JSON.parse(text) as AtlasData;
  if (data.schema !== 1) {
    throw new Error(`atlas.json has schema ${data.schema}; this interface reads schema 1 (docs/export.md).`);
  }
  cached = new Atlas(data);
  return cached;
}
