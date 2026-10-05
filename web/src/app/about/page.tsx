/* What the atlas is, how to use its data, how to cite and how to take part. A port of aboutView()
   in site/app.js, with the governance people of the atlas. */

import type { Metadata } from "next";

import { loadAtlas } from "@/lib/load";
import { pageMetadata, staticFile } from "@/lib/site";

export function generateMetadata(): Metadata {
  return pageMetadata(
    "About",
    "What the atlas is, its model, how to use its data, how to cite it and how to contribute.",
    "/about/",
  );
}

export default function AboutPage() {
  const atlas = loadAtlas();
  const data = atlas.data;
  return (
    <div className="prose">
      <h1>About the atlas</h1>
      <p className="lede">
        Escape velocity is the speed at which a rocket stops falling back. A technology has one too: the point where it
        works well enough, cheaply enough and reliably enough to carry on by itself.
      </p>
      <h2>The model</h2>
      <ul>
        <li>
          <b>A technology</b> is a capability with a measurable target, a statement and a scope.
        </li>
        <li>
          <b>Each metric</b> has three numbers: the best value demonstrated so far, the target with its rationale, and the
          physical limit where one exists.
        </li>
        <li>
          <b>Gaps</b> are classified by type, layer and severity. A gap held open by another technology points to it.
        </li>
        <li>
          <b>Evidence cards</b> carry every number: the source, a verbatim quote, the conditions and a class (established,
          reported, extrapolation, speculation).
        </li>
      </ul>
      <p>
        The full model is in <a href={`${data.repository}/blob/main/docs/model.md`}>docs/model.md</a>.
      </p>
      <h2>Use the data</h2>
      <ul>
        <li>
          <a href={staticFile("atlas.json")}>atlas.json</a>: the whole atlas in one file, with gap sizes, dependents and
          citations (<a href={`${data.repository}/blob/main/docs/export.md`}>format</a>).
        </li>
        <li>
          <a href={staticFile("llms.txt")}>llms.txt</a> and <a href={staticFile("llms-full.txt")}>llms-full.txt</a>: the
          atlas for language models.
        </li>
        <li>
          An MCP server for agents, in <a href={`${data.repository}/blob/main/tools/mcp_server.py`}>tools/mcp_server.py</a>:
          technologies, gaps, dependencies, bottlenecks, evidence and literature search.
        </li>
      </ul>
      <h2>Cite</h2>
      <p>
        Cite the atlas version you used: this page shows version{" "}
        <a href={`${data.repository}/commit/${data.version}`}>
          <code>{data.version}</code>
        </a>{" "}
        ({data.version_date}). The citation metadata is in <a href={`${data.repository}/blob/main/CITATION.cff`}>CITATION.cff</a>.
        Data is under CC0 1.0, text under CC BY 4.0 and code under Apache 2.0.
      </p>
      <h2>Contribute</h2>
      <p>
        One sourced number is a real contribution. Every change, from a person or an agent, is a pull request reviewed by a
        person. See <a href={`${data.repository}/blob/main/CONTRIBUTING.md`}>CONTRIBUTING.md</a>.
      </p>
      <p>
        Each domain has moderators and each tracked technology has curators. They review the changes to what they look
        after, and only they mark an evidence card as verified. How the roles work, and how to take one, is in{" "}
        <a href={atlas.governanceUrl()}>GOVERNANCE.md</a>.
      </p>
      <h2>The Alan Machine</h2>
      <p>
        <a href={data.alan_machine}>The Alan Machine</a> is an open-source book about a hypothetical supercomputer at the
        physical limits of computation. The atlas shares its metrics and its kinds of claim, and links each technology to
        the pages that discuss it.
      </p>
      <p className="small muted">
        Out of scope: weapons, dual-use research of concern, surveillance aimed at people, investment advice and medical
        advice.
      </p>
    </div>
  );
}
