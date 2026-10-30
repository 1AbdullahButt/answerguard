// Impact metrics (SPEC §11), stored in this browser only. Labeled "Simulated · this browser".
import type { CheckResult } from "@/lib/engine/types";
import { fnv1a } from "./hash";
import { readJson, removeKey, writeJson } from "./storage";

const KEY = "answerguard.metrics.v1";

export type Review = "correct" | "false_alarm";

export interface PastFlag {
  checkHash: string;
  ticketId: string;
  customer: string;
  decision: "CAUTION" | "HOLD" | "ESCALATE";
  headline: string;
  draft: string;
  at: string;
  review: Review | null;
}

export interface Metrics {
  /** Distinct `${ticketId}:${draftHash}` pairs that were checked. */
  checked: string[];
  intercepts: number;
  flags: PastFlag[];
}

export function emptyMetrics(): Metrics {
  return { checked: [], intercepts: 0, flags: [] };
}

export function loadMetrics(): Metrics {
  const m = readJson<Partial<Metrics> | null>(KEY, null);
  if (!m || typeof m !== "object") return emptyMetrics();
  return {
    checked: Array.isArray(m.checked) ? m.checked.filter((x): x is string => typeof x === "string") : [],
    intercepts: typeof m.intercepts === "number" && m.intercepts >= 0 ? m.intercepts : 0,
    flags: Array.isArray(m.flags) ? m.flags : [],
  };
}

export function saveMetrics(m: Metrics): void {
  writeJson(KEY, m);
}

export function clearMetrics(): void {
  removeKey(KEY);
}

/** Records a completed check: one "draft checked" per (ticket, draft hash), one past flag per flagged check hash. */
export function recordCheck(
  m: Metrics,
  ticketId: string,
  customer: string,
  draft: string,
  result: CheckResult,
  at: string,
): Metrics {
  if (result.decision === "AI_UNAVAILABLE") return m; // nothing was checked
  const pair = `${ticketId}:${fnv1a(draft)}`;
  const checked = m.checked.includes(pair) ? m.checked : [...m.checked, pair];
  let flags = m.flags;
  const d = result.decision;
  if ((d === "CAUTION" || d === "HOLD" || d === "ESCALATE") && !m.flags.some((f) => f.checkHash === result.checkHash)) {
    const flag: PastFlag = { checkHash: result.checkHash, ticketId, customer, decision: d, headline: result.headline, draft, at, review: null };
    flags = [flag, ...m.flags].slice(0, 50);
  }
  return { ...m, checked, flags };
}

export function recordIntercept(m: Metrics): Metrics {
  return { ...m, intercepts: m.intercepts + 1 };
}

export function setReview(m: Metrics, checkHash: string, review: Review | null): Metrics {
  return { ...m, flags: m.flags.map((f) => (f.checkHash === checkHash ? { ...f, review } : f)) };
}

export function falseAlarmStats(m: Metrics): { reviewed: number; falseAlarms: number; rate: number | null } {
  const reviewed = m.flags.filter((f) => f.review !== null).length;
  const falseAlarms = m.flags.filter((f) => f.review === "false_alarm").length;
  return { reviewed, falseAlarms, rate: reviewed >= 3 ? falseAlarms / reviewed : null };
}
