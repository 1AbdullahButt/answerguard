#!/usr/bin/env node
// PreToolUse hook. Once .loop/locked exists, blocks any change to the locked paths
// (tests/, SPEC.md, IMPLEMENTATION_BRIEF.md, data/seed/, plus extra lines in .loop/locked).
// Always blocks `git worktree add` (CLAUDE.md rule 8). Exit 2 = block, message on stderr.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const BASE_LOCKED = ["tests/", "spec.md", "implementation_brief.md", "data/seed/"];

const norm = (p) => String(p ?? "").replace(/\\/g, "/").replace(/\/+/g, "/").toLowerCase();

function readInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

function block(msg) {
  process.stderr.write(`BLOCKED by protect-locked: ${msg}\n`);
  process.exit(2);
}

const input = readInput();
const projectDir = norm(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd()).replace(/\/$/, "");
const tool = input.tool_name ?? "";
const ti = input.tool_input ?? {};
const command = typeof ti.command === "string" ? ti.command : "";
const cmd = norm(command);

if (/\bgit\s+worktree\s+add\b/.test(cmd)) {
  block("`git worktree add` is not allowed. Work directly in D:\\Project\\slite on main; use `git switch -c` for a branch (CLAUDE.md rule 8).");
}

const lockFile = path.join(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd(), ".loop", "locked");
if (!existsSync(lockFile)) process.exit(0);

const extra = readFileSync(lockFile, "utf8")
  .split(/\r?\n/)
  .map((l) => norm(l.trim()))
  .filter((l) => l && !l.startsWith("#"));
const locked = [...new Set([...BASE_LOCKED, ...extra])];

// Project-relative, normalized path for a file argument.
function rel(p) {
  let n = norm(p);
  // Git Bash style /d/project/... → d:/project/...
  n = n.replace(/^\/([a-z])\//, "$1:/");
  const pd = projectDir.replace(/^\/([a-z])\//, "$1:/");
  if (n.startsWith(pd + "/")) n = n.slice(pd.length + 1);
  return n.replace(/^\.\//, "");
}

function isLockedPath(p) {
  const r = rel(p);
  return locked.some((l) => (l.endsWith("/") ? r === l.slice(0, -1) || r.startsWith(l) : r === l));
}

const msg = (what) =>
  `${what} is locked (SPEC is the contract; see CLAUDE.md rule 1). ` +
  "If a locked test or doc is wrong, write .loop/BLOCKER.md with the test, line, expected vs actual and SPEC section, then stop.";

// File-editing tools.
if (["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)) {
  const target = ti.file_path ?? ti.notebook_path ?? ti.path;
  if (target && isLockedPath(target)) block(msg(`"${rel(target)}"`));
  process.exit(0);
}

if (!["Bash", "PowerShell"].includes(tool) || !cmd) process.exit(0);

// Does the command mention a locked path?
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function lockedRefRegex(l) {
  const body = l.endsWith("/") ? `${esc(l.slice(0, -1))}(?=$|[\\s"';|&)/*])` : `${esc(l)}(?=$|[\\s"';|&)])`;
  return new RegExp(`(?:^|[\\s"'(=,]|\\./|${esc(projectDir)}/|/)${body}`);
}
const lockedRefs = locked.filter((l) => lockedRefRegex(l).test(cmd));

// Whole-tree operations that would revert or wipe locked files.
if (/\bgit\s+(reset\s+--hard|clean\b|checkout\s+(--\s+)?\.(\s|$)|restore\s+(\S+\s+)*\.(\s|$)|stash\b)/.test(cmd)) {
  block("whole-tree git reset/clean/checkout/restore/stash could change locked files. Target specific unlocked paths instead.");
}

if (lockedRefs.length === 0) process.exit(0);

// Redirects into a locked path.
for (const m of cmd.matchAll(/(?:^|[^0-9&])>{1,2}\s*["']?([^\s"';|&]+)/g)) {
  if (m[1] && isLockedPath(m[1])) block(msg(`Redirect into "${rel(m[1])}"`));
}

// Copy commands: only the destination (last argument) matters.
const copyVerb = /(?:^|[;&|]\s*|\s)(cp|copy|xcopy|robocopy|copy-item)\s/;
const segments = cmd.split(/&&|\|\||;|\|/);
for (const seg of segments) {
  if (copyVerb.test(" " + seg.trim())) {
    const args = seg.trim().split(/\s+/).filter((a) => !a.startsWith("-"));
    const dest = args[args.length - 1]?.replace(/^["']|["']$/g, "");
    if (dest && isLockedPath(dest)) block(msg(`Copy into "${rel(dest)}"`));
  }
}

// Any mutating verb in a command that names a locked path.
const mutating =
  /\b(rm|rmdir|rd|del|erase|unlink|mv|move|ren|rename|remove-item|move-item|rename-item|set-content|add-content|clear-content|out-file|new-item|tee|tee-object|truncate|touch|chmod|ln|sed\s+-i|perl\s+-[a-z]*i|git\s+(checkout|restore|rm|mv|apply|am)|writefile(sync)?|appendfile(sync)?|rmsync|unlinksync|renamesync|copyfile(sync)?|cpsync|open\([^)]*['"]w)\b/;
const verb = cmd.match(mutating);
if (verb) block(msg(`"${verb[0]}" on ${lockedRefs.map((r) => `"${r}"`).join(", ")}`));

process.exit(0);
