// Rule A (SPEC §6.5).
import type { Applicability, Rail, ScopeRail } from "./types";

export function applicability(scope: ScopeRail, ticketRail: Rail): Applicability {
  if (scope === "any") return "APPLIES";
  if (ticketRail === "unknown") return "SCOPE_UNRESOLVED";
  return scope === ticketRail ? "APPLIES" : "NOT_APPLICABLE";
}

export const RAIL_LABEL: Record<ScopeRail | Rail, string> = {
  instant: "instant rail",
  standard: "standard rail",
  any: "all rails",
  unknown: "unknown rail",
};
