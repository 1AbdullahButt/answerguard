// The AI dependencies used by the API routes: cache → saved responses → live provider (Groq by default, D-001)
// behind the shared limiter. One limiter unit per check that actually needs a live call (SPEC §10).
import { aiDeps, createRuntime } from "@/lib/ai/aiDeps";
import type { CheckDeps } from "@/lib/engine/types";
import { allowLiveCheck, clientIp } from "@/lib/rateLimit";

export function routeDeps(headers: Headers): CheckDeps {
  const ip = clientIp(headers);
  return aiDeps(createRuntime({ liveGate: () => allowLiveCheck(ip) }));
}
