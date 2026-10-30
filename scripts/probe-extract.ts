// Debug helper: prints one provider's raw extraction for a seed source, with quote validation.
//   pnpm tsx scripts/probe-extract.ts gemini SRC-202
import { loadEnvConfig } from "@next/env";
import { aiDeps, createRuntime } from "@/lib/ai/aiDeps";
import { createAiCache } from "@/lib/ai/cache";
import type { ProviderName } from "@/lib/ai/client";
import { isVerbatim } from "@/lib/engine/normalize";
import { seedSources } from "@/lib/workspace/seed";

loadEnvConfig(process.cwd());

async function main() {
  const [provider = "groq", id = "SRC-202"] = process.argv.slice(2);
  const source = seedSources().find((s) => s.id === id);
  if (!source) throw new Error(`unknown source ${id}`);
  const rt = createRuntime({ only: provider as ProviderName, cache: createAiCache() });
  const r = await aiDeps(rt).extractSource({ id: source.id, title: source.title, kind: source.kind, version: source.version, body: source.body });
  console.log(JSON.stringify(r.info));
  for (const c of r.claims) {
    console.log(JSON.stringify(c));
    console.log(`  quote verbatim: ${isVerbatim(c.quote, source.body)}`);
  }
}

void main();
