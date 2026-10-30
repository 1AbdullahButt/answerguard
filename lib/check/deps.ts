// The AI dependencies used by the API routes. Phase 1 ships no AI code: every extraction reports
// "AI unavailable", which the engine turns into AI_UNAVAILABLE (draft) or SOURCE_UNREAD (sources).
// Phase 2 replaces this with the provider-backed implementation in lib/ai/.
import type { AiRunInfo, CheckDeps } from "@/lib/engine/types";

const UNAVAILABLE: AiRunInfo = { mode: "unavailable", model: "none", latencyMs: 0, promptVersion: "none" };

class AiUnavailableError extends Error {
  readonly info = UNAVAILABLE;
}

export function routeDeps(): CheckDeps {
  return {
    extractDraft: async () => {
      throw new AiUnavailableError("AI provider not configured");
    },
    extractSource: async () => {
      throw new AiUnavailableError("AI provider not configured");
    },
  };
}
