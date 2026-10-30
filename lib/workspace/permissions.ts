// Simulated personas (SPEC §8). This is filtering logic, not access control: anyone can switch persona.
// What is enforced: for the persona in the request, hidden sources are removed before extraction and never
// appear in a response. Visibility always comes from the server's seed data.
import type { Role, Source, Visibility } from "@/lib/engine/types";

const VISIBLE_TO: Record<Role, ReadonlySet<Visibility>> = {
  support_agent: new Set(["everyone"]),
  ops_lead: new Set(["everyone", "ops"]),
};

export function visibleSources(sources: Source[], role: Role): Source[] {
  const allowed = VISIBLE_TO[role];
  return sources.filter((s) => allowed.has(s.visibility));
}
