// Lists the Groq models available to the configured key (never prints the key).
// Usage: pnpm tsx scripts/groq-models.ts
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.error("GROQ_API_KEY is not set");
    process.exit(1);
  }
  const res = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` } });
  console.log(`HTTP ${res.status}`);
  const json = (await res.json()) as { data?: Array<{ id: string; owned_by?: string; context_window?: number; active?: boolean }> };
  for (const m of (json.data ?? []).sort((a, b) => a.id.localeCompare(b.id))) {
    console.log(`${m.id}\t${m.owned_by ?? ""}\tctx=${m.context_window ?? "?"}\tactive=${m.active ?? "?"}`);
  }
}

void main();
