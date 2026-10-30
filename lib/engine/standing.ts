// Rule S (SPEC §6.4): claim standing, applied in order, plus weakeners attached to candidates.
import { parseTime } from "./normalize";
import type { Source, SourceClaim, Standing, Weakener } from "./types";

export interface StandingResult {
  standing: Standing;
  rule: "S1" | "S2" | "S3" | "S4";
  detail: string;
}

export function claimStanding(claim: SourceClaim, source: Source, decisionTime: number): StandingResult {
  if (source.flaggedOutdated) {
    return { standing: "EXCLUDED", rule: "S1", detail: `${source.id} is flagged outdated${source.flagNote ? ` ("${source.flagNote}")` : ""}.` };
  }
  if (claim.statusWording === "deprecated") {
    return { standing: "EXCLUDED", rule: "S1", detail: `The text marks this as deprecated.` };
  }
  if (source.kind === "slack" || source.kind === "release_note") {
    return { standing: "PROPOSAL", rule: "S2", detail: `${source.kind === "slack" ? "Slack message" : "Release note"}: informal sources can signal a change but never govern.` };
  }
  if (claim.statusWording === "proposed" || claim.statusWording === "pending_approval") {
    return { standing: "PROPOSAL", rule: "S2", detail: `The text says this is ${claim.statusWording === "proposed" ? "proposed" : "pending approval"}.` };
  }
  const effective = parseTime(claim.effectiveFrom);
  if (effective !== null && effective > decisionTime) {
    return { standing: "NOT_YET_EFFECTIVE", rule: "S3", detail: `Effective from ${claim.effectiveFrom}, which is after the decision time.` };
  }
  return { standing: "CANDIDATE", rule: "S4", detail: `A ${source.kind} that is in force and not excluded.` };
}

/** Weakeners never exclude a candidate and never break ties (SPEC §6.4). Verification is not authority. */
export function weakeners(source: Source): Weakener[] {
  const out: Weakener[] = [];
  if (source.verification === "unverified") out.push("UNVERIFIED");
  if (source.verification === "expired") out.push("VERIFICATION_EXPIRED");
  const verifiedAt = parseTime(source.verifiedAt);
  const updatedAt = parseTime(source.updatedAt);
  if (source.verification === "verified" && verifiedAt !== null && updatedAt !== null && updatedAt > verifiedAt) {
    out.push("EDITED_AFTER_VERIFICATION");
  }
  if (source.owner && !source.owner.active) out.push("OWNER_INACTIVE");
  return out;
}
