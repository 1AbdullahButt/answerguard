#!/usr/bin/env node
// Writes or clears .loop/waiting.json (DECISIONS D-020). Preferred form, as a background command:
//   node scripts/waiting.mjs run "live eval" -- pnpm eval
// "run" records THIS process's PID, runs the command through the shell, waits for it, removes the marker and exits
// with the command's exit code. The Stop hook therefore allows stopping only while the command is actually running,
// and for at most 30 minutes. (Recording the parent shell's PID doesn't work on Windows/Git Bash: the visible parent
// is a short-lived wrapper process.) "start" / "stop" remain for manual use.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), ".loop", "waiting.json");
const [cmd = "start", ...rest] = process.argv.slice(2);

function write(pid, what) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ pid, what: what || "background task", startedAt: new Date().toISOString() }, null, 2));
}

if (cmd === "stop") {
  rmSync(file, { force: true });
} else if (cmd === "run") {
  const sep = rest.indexOf("--");
  const what = (sep === -1 ? [] : rest.slice(0, sep)).join(" ");
  const command = (sep === -1 ? rest : rest.slice(sep + 1)).join(" ");
  if (!command) {
    console.error('usage: node scripts/waiting.mjs run "<what>" -- <command>');
    process.exit(2);
  }
  write(process.pid, what);
  const child = spawn(command, { shell: true, stdio: "inherit" });
  child.on("exit", (code, signal) => {
    rmSync(file, { force: true });
    process.exit(code ?? (signal ? 1 : 0));
  });
} else {
  write(process.ppid, rest.join(" "));
}
