#!/usr/bin/env node
// Scans the staged diff (`git diff --cached`) for API keys and tokens. Exits 1 on a hit so the commit aborts.
// Prints the file and pattern name only, never the matched value.
import { execFileSync } from "node:child_process";

const diff = execFileSync("git", ["diff", "--cached", "-U0", "--no-color"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const patterns = [
  ["Anthropic key", /sk-ant-[A-Za-z0-9_-]{10,}/],
  ["Groq key", /gsk_[A-Za-z0-9]{20,}/],
  ["OpenAI-style key", /\bsk-[A-Za-z0-9]{32,}/],
  ["GitHub token", /\b(gh[opusr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/],
  ["Vercel token", /\bvercel_[A-Za-z0-9]{20,}/i],
  ["Upstash token assignment", /UPSTASH_REDIS_REST_TOKEN\s*[=:]\s*["']?[A-Za-z0-9_=-]{16,}/],
  ["AWS key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Generic secret assignment", /\b(api[_-]?key|secret|token|password)\b["']?\s*[:=]\s*["'][A-Za-z0-9_\-./+=]{20,}["']/i],
];

let file = "";
const hits = [];
for (const line of diff.split("\n")) {
  if (line.startsWith("+++ ")) {
    file = line.slice(6);
    continue;
  }
  if (!line.startsWith("+") || line.startsWith("+++")) continue;
  for (const [name, re] of patterns) if (re.test(line)) hits.push(`${file}: ${name}`);
}

const staged = execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf8" }).split("\n").filter(Boolean);
for (const f of staged) {
  const base = f.split("/").pop() ?? "";
  if (/^\.env(\..*)?$/.test(base) && base !== ".env.example") hits.push(`${f}: env file staged`);
}

if (hits.length) {
  console.error("precommit-scan: possible secrets in staged changes — commit aborted:\n  " + [...new Set(hits)].join("\n  "));
  process.exit(1);
}
console.log(`precommit-scan: clean (${staged.length} staged files checked)`);
