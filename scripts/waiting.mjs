#!/usr/bin/env node
// Writes or clears .loop/waiting.json (DECISIONS D-020). Use as the first and last step of a long background command:
//   node scripts/waiting.mjs start "live eval"; pnpm eval; node scripts/waiting.mjs stop
// "start" records the PID of the shell that runs the chain (this process's parent), so the Stop hook allows stopping
// only while that shell is still running, and for at most 30 minutes.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), ".loop", "waiting.json");
const [cmd = "start", ...what] = process.argv.slice(2);

if (cmd === "stop") {
  rmSync(file, { force: true });
} else {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ pid: process.ppid, what: what.join(" ") || "background task", startedAt: new Date().toISOString() }, null, 2));
}
