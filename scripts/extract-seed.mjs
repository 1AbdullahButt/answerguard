#!/usr/bin/env node
// One-time generator: copies the seed source bodies from SPEC.md Appendix A into data/seed/docs/*.md
// byte-for-byte (so nothing is retyped by hand), and verifies each written file round-trips.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const spec = readFileSync(path.join(root, "SPEC.md"), "utf8").replace(/\r\n/g, "\n");
const appendix = spec.slice(spec.indexOf("## Appendix A"), spec.indexOf("## Appendix B"));

const ids = ["DOC-101", "DOC-103", "SRC-202", "DOC-104", "DOC-105"];
const outDir = path.join(root, "data", "seed", "docs");
mkdirSync(outDir, { recursive: true });

for (const id of ids) {
  const header = appendix.indexOf(`**${id} ·`);
  if (header < 0) throw new Error(`header for ${id} not found`);
  const fenceStart = appendix.indexOf("```", header);
  const bodyStart = appendix.indexOf("\n", fenceStart) + 1;
  const fenceEnd = appendix.indexOf("\n```", bodyStart);
  const body = appendix.slice(bodyStart, fenceEnd) + "\n";
  const file = path.join(outDir, `${id}.md`);
  writeFileSync(file, body, "utf8");
  const back = readFileSync(file, "utf8");
  if (back !== body) throw new Error(`round-trip mismatch for ${id}`);
  console.log(`${id}: ${body.length} chars written to data/seed/docs/${id}.md`);
}
