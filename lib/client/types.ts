import type { CheckResult, Rail, Role, Source, Ticket } from "@/lib/engine/types";

export interface SeedResponse {
  role: Role;
  tickets: Ticket[];
  sources: Source[];
}

/** A full client-side override record, one per edited source (SPEC §9). */
export interface OverrideRecord {
  id: string;
  body: string;
  version: number;
  updatedAt: string;
  verification: Source["verification"];
  verifiedAt: string | null;
  flaggedOutdated: boolean;
  ownerActive: boolean;
  deleted: boolean;
}

/** What a result was computed from, so the UI can tell when it is stale. */
export interface CheckKey {
  ticketId: string;
  rail: Rail;
  draft: string;
  role: Role;
  workspace: string;
}

export interface StoredResult {
  key: CheckKey;
  result: CheckResult;
  /** Set when an edit changed the decision, for the one-time "Changed because…" chip. */
  changedFrom: { decision: CheckResult["decision"]; because: string } | null;
}

export type Tab = "check" | "reasoning" | "sources" | "impact";

export type StaleReason = "draft" | "rail" | "persona" | "workspace" | null;
