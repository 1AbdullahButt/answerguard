#!/usr/bin/env node
// Stop hook. While the build loop is active (.loop/phase exists), refuses to let the agent stop unless:
//   - PROGRESS.md's "## Phase N" section has "GATE: PASSED" and at least one fenced evidence block, or
//   - .loop/await-human.md exists (human checkpoint), or
//   - .loop/BLOCKER.md exists, or
//   - .loop/waiting.json names a still-running background PID and is under 30 minutes old (D-020).
// When it blocks, it names the next step of the loop.
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  /* no input */
}
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const p = (...s) => path.join(root, ...s);
const read = (f) => (existsSync(f) ? readFileSync(f, "utf8") : "");

const allow = () => process.exit(0);
const block = (reason) => {
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
};

const phaseRaw = read(p(".loop", "phase")).trim();
if (!phaseRaw) allow(); // loop not active
if (existsSync(p(".loop", "await-human.md"))) allow();
if (existsSync(p(".loop", "BLOCKER.md"))) allow();

// Narrow exception (DECISIONS D-020, approved by Abdullah): waiting on a running background process.
// Allowed only while .loop/waiting.json names a PID that is still running AND the file is less than 30 minutes old.
// Anything else (no file, bad JSON, dead PID, stale file) falls through to the normal gate check.
const waitingFile = p(".loop", "waiting.json");
if (existsSync(waitingFile)) {
  try {
    const { pid } = JSON.parse(readFileSync(waitingFile, "utf8"));
    const fresh = Date.now() - statSync(waitingFile).mtimeMs < 30 * 60_000;
    let running = false;
    if (Number.isInteger(pid) && pid > 0) {
      try {
        process.kill(pid, 0); // signal 0: existence check only, sends nothing
        running = true;
      } catch (e) {
        running = e?.code === "EPERM"; // exists but owned by someone else
      }
    }
    if (fresh && running) allow();
  } catch {
    /* malformed marker: ignore */
  }
}

const phase = Number.parseInt(phaseRaw, 10);
const progress = read(p("PROGRESS.md")).replace(/\r\n/g, "\n");

// Extract the "## Phase N" section (up to the next "## " heading).
const re = new RegExp(`^## Phase ${phase}\\b[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m");
const section = progress.match(re)?.[1] ?? "";
const passed = /^\s*GATE:\s*PASSED\b/m.test(section);
const hasEvidence = /```[\s\S]+?```/.test(section);

if (passed && hasEvidence) allow();

const findings = read(p(".loop", "qa-findings.md"));
let next;
if (passed && !hasEvidence) {
  next = `PROGRESS.md marks Phase ${phase} PASSED but has no fenced evidence block. Paste the real test output, QA verdict and \`git worktree list\` under "## Phase ${phase}".`;
} else if (/VERDICT:\s*CHANGES_REQUIRED/.test(findings)) {
  next = "QA requested changes. Next: builder fixes every blocker/major item in .loop/qa-findings.md, then tester runs the tests (paste real output), then qa reviews again. Count attempts per issue in .loop/attempts.json; on the 5th failure of the same issue write .loop/BLOCKER.md.";
} else if (/VERDICT:\s*APPROVED/.test(findings)) {
  next = `QA approved. Next: confirm tests pass, write "GATE: PASSED" with the real output, QA verdict and \`git worktree list\` under "## Phase ${phase}" in PROGRESS.md, run the secret scan, commit "Phase ${phase}: gate passed", push, then advance .loop/phase.`;
} else {
  next = `Phase ${phase} gate has not passed. Next loop step: builder implements the remaining Phase ${phase} work from PLAN.md, tester runs the tests and pastes the real output, then qa reviews and writes .loop/qa-findings.md. If you need the human, write .loop/await-human.md; if stuck after 5 attempts, write .loop/BLOCKER.md.`;
}
block(`[gate-stop] ${next}`);
