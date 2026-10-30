// Overall decision ordering (SPEC §6.6): AI_UNAVAILABLE > ESCALATE > HOLD > CAUTION > ALLOW.
import type { OverallDecision } from "./types";

const RANK: Record<OverallDecision, number> = { ALLOW: 0, CAUTION: 1, HOLD: 2, ESCALATE: 3, AI_UNAVAILABLE: 4 };

export function severity(d: OverallDecision): number {
  return RANK[d];
}

export function mostSevere<T extends { decision: OverallDecision }>(items: T[]): T | undefined {
  return items.reduce<T | undefined>((worst, x) => (!worst || RANK[x.decision] > RANK[worst.decision] ? x : worst), undefined);
}
