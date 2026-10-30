#!/usr/bin/env node
// Self-test for .claude/hooks/protect-locked.mjs and gate-stop.mjs. Runs each hook against
// synthetic tool inputs inside a temporary project dir and prints the outcome per case.
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const lockHook = path.join(root, ".claude", "hooks", "protect-locked.mjs");
const stopHook = path.join(root, ".claude", "hooks", "gate-stop.mjs");

const dir = mkdtempSync(path.join(tmpdir(), "ag-hook-"));
mkdirSync(path.join(dir, ".loop"), { recursive: true });
writeFileSync(path.join(dir, ".loop", "locked"), "# extra locked paths\ne2e/\n");

const run = (hook, input) =>
  spawnSync(process.execPath, [hook], {
    input: JSON.stringify(input),
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    encoding: "utf8",
  });

const wt = ["git", "worktree", "add"].join(" ");
const cases = [
  ["Edit tests/ (Windows abs path)", { tool_name: "Edit", tool_input: { file_path: `${dir}\\tests\\engine\\t1-hold.test.ts` } }, 2],
  ["Write SPEC.md (relative)", { tool_name: "Write", tool_input: { file_path: "SPEC.md" } }, 2],
  ["Write e2e/ (extra lock line)", { tool_name: "Write", tool_input: { file_path: `${dir}/e2e/demo.spec.ts` } }, 2],
  ["Write lib/x.ts (allowed)", { tool_name: "Write", tool_input: { file_path: `${dir}\\lib\\x.ts` } }, 0],
  ["Bash rm -rf tests/engine", { tool_name: "Bash", tool_input: { command: "rm -rf tests/engine" } }, 2],
  ["Bash rm -rf tests", { tool_name: "Bash", tool_input: { command: "rm -rf tests" } }, 2],
  ["PowerShell Remove-Item tests\\fixtures", { tool_name: "PowerShell", tool_input: { command: "Remove-Item tests\\fixtures\\a.json" } }, 2],
  ["Bash redirect > SPEC.md", { tool_name: "Bash", tool_input: { command: "echo x > SPEC.md" } }, 2],
  ["PowerShell Set-Content data\\seed", { tool_name: "PowerShell", tool_input: { command: "Set-Content -Path data\\seed\\sources.json -Value '{}'" } }, 2],
  ["Bash mv IMPLEMENTATION_BRIEF.md", { tool_name: "Bash", tool_input: { command: "mv IMPLEMENTATION_BRIEF.md x.md" } }, 2],
  ["Bash cp into data/seed", { tool_name: "Bash", tool_input: { command: "cp /tmp/a.md data/seed/docs/DOC-101.md" } }, 2],
  ["Bash node writeFileSync tests/", { tool_name: "Bash", tool_input: { command: `node -e "require('fs').writeFileSync('tests/x.ts','')"` } }, 2],
  ["Bash git checkout -- tests/", { tool_name: "Bash", tool_input: { command: "git checkout -- tests/engine/t1-hold.test.ts" } }, 2],
  ["Bash git reset --hard", { tool_name: "Bash", tool_input: { command: "git reset --hard HEAD~1" } }, 2],
  ["Bash git worktree add", { tool_name: "Bash", tool_input: { command: `${wt} ../slite-b2` } }, 2],
  ["Bash run tests with redirect to out.txt (allowed)", { tool_name: "Bash", tool_input: { command: "pnpm vitest run tests/engine > out.txt" } }, 0],
  ["Bash cp out of tests/ (allowed)", { tool_name: "Bash", tool_input: { command: "cp tests/fixtures/a.json /tmp/a.json" } }, 0],
  ["Bash cat tests/ (allowed)", { tool_name: "Bash", tool_input: { command: "cat tests/engine/t1-hold.test.ts" } }, 0],
];

let failures = 0;
console.log("protect-locked.mjs (.loop/locked present)");
for (const [name, input, expected] of cases) {
  const r = run(lockHook, input);
  const ok = r.status === expected;
  if (!ok) failures++;
  const msg = (r.stderr || "").trim().split("\n")[0];
  console.log(`${ok ? "PASS" : "FAIL"}  exit=${r.status} (want ${expected})  ${name}${msg ? `\n        ${msg}` : ""}`);
}

console.log("\ngate-stop.mjs");
writeFileSync(path.join(dir, ".loop", "phase"), "0\n");
writeFileSync(path.join(dir, "PROGRESS.md"), "# Progress\n\n## Phase 0\nwork in progress\n");
let r = run(stopHook, {});
console.log(`${r.stdout.includes('"block"') ? "PASS" : "FAIL"}  no gate → blocks: ${r.stdout.slice(0, 140)}…`);
if (!r.stdout.includes('"block"')) failures++;
writeFileSync(path.join(dir, "PROGRESS.md"), "# Progress\n\n## Phase 0\n```\nTests 9 failed\n```\nGATE: PASSED\n\n## Phase 1\n");
r = run(stopHook, {});
console.log(`${r.stdout === "" ? "PASS" : "FAIL"}  gate passed with evidence → allows`);
if (r.stdout !== "") failures++;
writeFileSync(path.join(dir, ".loop", "phase"), "1\n");
writeFileSync(path.join(dir, ".loop", "await-human.md"), "need approval\n");
r = run(stopHook, {});
console.log(`${r.stdout === "" ? "PASS" : "FAIL"}  await-human.md → allows`);
if (r.stdout !== "") failures++;

rmSync(dir, { recursive: true, force: true });
console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
