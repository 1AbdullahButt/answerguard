// Presentation helpers: decision labels, reason codes in words, dates, signal chips, quote location.
// Pure functions; no I/O.
import type {
  CheckResult,
  ClaimResult,
  Evidence,
  OverallDecision,
  ReasonCode,
  Source,
  Standing,
  Value,
  Weakener,
} from "@/lib/engine/types";

export type Tone = "allow" | "caution" | "hold" | "esc" | "off";

export const DECISION_META: Record<OverallDecision, { label: string; sub: string; tone: Tone }> = {
  ALLOW: { label: "Allow", sub: "safe to send", tone: "allow" },
  CAUTION: { label: "Caution", sub: "verify before sending", tone: "caution" },
  HOLD: { label: "Hold", sub: "don't send this draft", tone: "hold" },
  ESCALATE: { label: "Escalate", sub: "confirm before answering", tone: "esc" },
  AI_UNAVAILABLE: { label: "AI unavailable", sub: "not checked", tone: "off" },
};

/** Reason codes in plain words. Codes themselves only appear in the Reasoning tab and Raw JSON (D-021). */
export const REASON_WORDS: Record<ReasonCode, string> = {
  EXTRACTION_FAILED: "AnswerGuard couldn't read this draft",
  EXTRACTION_GAP: "couldn't confirm the timing in this draft",
  OUTSIDE_COVERAGE: "the draft promises something outside what AnswerGuard covers",
  NO_POLICY_CLAIM: "no policy claims in this reply",
  SCOPE_UNKNOWN: "the rail is unknown and the rules differ by rail",
  PROPOSAL_ONLY: "only a proposed change mentions this",
  UNSUPPORTED: "no source supports this claim",
  CONFLICT_UNRESOLVED: "the sources disagree and no rule picks a winner",
  UNIT_MISMATCH: "the draft and the policy use different units",
  CONTRADICTS_GOVERNING: "contradicts the governing policy",
  HEDGED_CONTRADICTION: "a hedged claim that differs from the policy",
  SUPPORTED: "matches the governing policy",
  WEAK_BASIS: "the governing source's verification is in doubt",
  CHANGE_SIGNALLED: "a change to this policy is signalled",
  SOURCE_UNREAD: "a source couldn't be read",
};

export const WEAKENER_WORDS: Record<Weakener, string> = {
  UNVERIFIED: "Unverified",
  VERIFICATION_EXPIRED: "Verification expired",
  EDITED_AFTER_VERIFICATION: "Edited after verification",
  OWNER_INACTIVE: "Owner inactive",
};

export const STANDING_WORDS: Record<Standing, string> = {
  CANDIDATE: "Candidate",
  PROPOSAL: "Proposal",
  NOT_YET_EFFECTIVE: "Not yet effective",
  EXCLUDED: "Excluded",
};

const VIA_RULE: Record<string, string> = {
  CONSENSUS: "Rule D4 · consensus",
  EXPLICIT_SUPERSESSION: "Rule D5 · supersession",
  SPECIFIC_EXCEPTION: "Rule D6 · specific exception",
};

const RULE_WORDS: Record<string, string> = {
  D0: "draft read",
  D0a: "draft unreadable",
  D0b: "extraction gap",
  D0c: "outside coverage",
  D0d: "no policy claim",
  D1: "scope unknown",
  D2: "proposal only",
  D3: "unsupported",
  D4: "consensus",
  D5: "supersession",
  D6: "specific exception",
  D7: "conflict",
  D8: "unit mismatch",
  D9: "contradiction",
  D10: "supported",
  D11a: "weak basis",
  D11b: "change signalled",
};

export function ruleLabel(rule: string): string {
  const w = RULE_WORDS[rule];
  return w ? `Rule ${rule} · ${w}` : `Rule ${rule}`;
}

/** The rule that settled the outcome, for the banner meta row. */
export function governingRule(result: CheckResult): string | null {
  const claim = mostSevereClaim(result);
  if (claim?.governing) return VIA_RULE[claim.governing.via] ?? null;
  if (claim) {
    const fired = claim.trace.find((t) => t.outcome === "fired");
    if (fired) return ruleLabel(fired.rule);
  }
  const top = result.trace.find((t) => t.outcome === "fired" && t.rule !== "Overall");
  return top ? ruleLabel(top.rule) : null;
}

const SEVERITY: Record<OverallDecision, number> = { ALLOW: 0, CAUTION: 1, HOLD: 2, ESCALATE: 3, AI_UNAVAILABLE: 4 };

export function mostSevereClaim(result: CheckResult): ClaimResult | null {
  let best: ClaimResult | null = null;
  for (const c of result.claims) if (!best || SEVERITY[c.decision] > SEVERITY[best.decision]) best = c;
  return best;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-26" → "Oct 26". Date-only strings are read as calendar dates (no timezone shift). */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return `${MONTHS[Number(m[2]) - 1] ?? ""} ${Number(m[3])}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getMonth()] ?? ""} ${d.getDate()}`;
}

export function timeOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${shortDate(iso)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const UNIT_WORDS: Record<NonNullable<Value>["unit"], [string, string]> = {
  business_days: ["business day", "business days"],
  calendar_days: ["day", "days"],
  hours: ["hour", "hours"],
};

export function valueWords(v: Value): string {
  if (!v) return "no value";
  const [one, many] = UNIT_WORDS[v.unit];
  if (v.amountMax !== undefined && v.amountMax !== v.amount) return `${v.amount}–${v.amountMax} ${many}`;
  return `${v.amount} ${v.amount === 1 ? one : many}`;
}

export function railWords(rail: "instant" | "standard" | "any"): string {
  return rail === "any" ? "all rails" : `${rail} rail`;
}

export function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

export type ChipTone = "neutral" | "ok" | "warn" | "bad";
export type ChipIcon = "verified" | "owner" | "calendar" | "rail" | "edit" | "flag" | "informal" | "eyeoff" | "none";
export interface Chip {
  text: string;
  tone: ChipTone;
  icon: ChipIcon;
}

/** Signal chips for one piece of evidence (SPEC §7.2). Weakeners are amber, exclusion reasons red. */
export function evidenceChips(ev: Evidence): Chip[] {
  const s = ev.source.signals;
  const chips: Chip[] = [];
  if (s.verification === "verified" && s.verifiedAt) chips.push({ text: `Verified ${shortDate(s.verifiedAt)}`, tone: "ok", icon: "verified" });
  if (s.owner) chips.push({ text: `Owner ${firstName(s.owner.name)}`, tone: "neutral", icon: "owner" });
  if (ev.claim.effectiveFrom) chips.push({ text: `Effective ${shortDate(ev.claim.effectiveFrom)}`, tone: "neutral", icon: "calendar" });
  const rail = ev.claim.scope.rail;
  chips.push({ text: rail === "any" ? "All rails" : `${rail === "instant" ? "Instant" : "Standard"} rail only`, tone: "neutral", icon: "none" });
  for (const w of ev.weakeners) chips.push({ text: WEAKENER_WORDS[w], tone: "warn", icon: w === "EDITED_AFTER_VERIFICATION" ? "edit" : "none" });
  if (!ev.weakeners.includes("UNVERIFIED") && s.verification === "unverified" && ev.source.kind !== "slack") chips.push({ text: "Unverified", tone: "neutral", icon: "none" });
  if (!ev.weakeners.includes("VERIFICATION_EXPIRED") && s.verification === "expired") chips.push({ text: "Verification expired", tone: "neutral", icon: "none" });
  if (!ev.weakeners.includes("OWNER_INACTIVE") && s.owner && !s.owner.active) chips.push({ text: "Owner inactive", tone: "neutral", icon: "none" });
  if (s.flaggedOutdated) chips.push({ text: s.flagNote ? `Flagged outdated: "${s.flagNote}"` : "Flagged outdated", tone: "bad", icon: "flag" });
  if (ev.source.kind === "slack" || ev.source.kind === "release_note") chips.push({ text: "Informal", tone: "neutral", icon: "informal" });
  if (s.visibility === "ops") chips.push({ text: "Ops only", tone: "neutral", icon: "eyeoff" });
  return chips;
}

/** Chips for a source row in the Sources tab (metadata only, no AI). */
export function sourceChips(s: Source, edited: boolean): Chip[] {
  const chips: Chip[] = [];
  if (s.verification === "verified" && s.verifiedAt) chips.push({ text: `Verified ${shortDate(s.verifiedAt)}`, tone: "ok", icon: "verified" });
  else if (s.verification === "expired") chips.push({ text: "Verification expired", tone: "warn", icon: "none" });
  else if (s.kind !== "slack") chips.push({ text: "Unverified", tone: "neutral", icon: "none" });
  if (s.verification === "verified" && s.verifiedAt && s.updatedAt > s.verifiedAt) chips.push({ text: "Edited after verification", tone: "warn", icon: "edit" });
  if (s.owner) chips.push({ text: s.owner.active ? s.owner.name : `${s.owner.name} (inactive)`, tone: s.owner.active ? "neutral" : "warn", icon: "owner" });
  chips.push({ text: s.kind.replace("_", " "), tone: "neutral", icon: "none" });
  if (s.flaggedOutdated) chips.push({ text: "Flagged outdated", tone: "bad", icon: "flag" });
  if (s.kind === "slack" || s.kind === "release_note") chips.push({ text: "Informal", tone: "neutral", icon: "informal" });
  if (s.visibility === "ops") chips.push({ text: "Ops only", tone: "neutral", icon: "eyeoff" });
  if (edited) chips.push({ text: `v${s.version} · edited here`, tone: "neutral", icon: "edit" });
  return chips;
}

// ---- quote location (mirrors the engine's normalization: whitespace, dashes, smart quotes) ------------

const DASHES = /[‐-―−]/;
const SQUOTES = /[‘’‚‛]/;
const DQUOTES = /[“”„‟]/;

function normChar(c: string): string {
  if (DASHES.test(c)) return "-";
  if (SQUOTES.test(c)) return "'";
  if (DQUOTES.test(c)) return '"';
  return c.toLowerCase();
}

function normalizeWithMap(text: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  let lastSpace = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i] ?? "";
    if (/\s/.test(c)) {
      if (!lastSpace && norm.length > 0) {
        norm += " ";
        map.push(i);
      }
      lastSpace = true;
      continue;
    }
    lastSpace = false;
    norm += normChar(c);
    map.push(i);
  }
  return { norm, map };
}

/** Finds `needle` in `text` (normalized), returning the [start, end) range in the original text. */
export function findRange(text: string, needle: string): { start: number; end: number } | null {
  if (!needle.trim()) return null;
  const direct = text.indexOf(needle);
  if (direct >= 0) return { start: direct, end: direct + needle.length };
  const t = normalizeWithMap(text);
  const n = normalizeWithMap(needle.trim()).norm.trim();
  const at = t.norm.indexOf(n);
  if (at < 0) return null;
  const start = t.map[at];
  const endIdx = t.map[at + n.length - 1];
  if (start === undefined || endIdx === undefined) return null;
  return { start, end: endIdx + 1 };
}

/** "Effective 27 Oct 2026" → the date text, for the read-only "from the text" field. */
export function effectiveFromText(body: string): string | null {
  const m = /effective\s+([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4}|[A-Za-z]{3,9}\s+[0-9]{1,2},?\s+[0-9]{4}|\d{4}-\d{2}-\d{2})/i.exec(body);
  return m?.[1] ?? null;
}

/** A one-line "what changed" summary between two texts: common prefix/suffix stripped. */
export function diffSummary(before: string, after: string): { removed: string; added: string } | null {
  if (before === after) return null;
  let p = 0;
  while (p < before.length && p < after.length && before[p] === after[p]) p++;
  let s = 0;
  while (s < before.length - p && s < after.length - p && before[before.length - 1 - s] === after[after.length - 1 - s]) s++;
  // widen to word boundaries so "1 business day" → "2 business days" reads naturally
  while (p > 0 && /\S/.test(before[p - 1] ?? "") && /\S/.test(after[p - 1] ?? "")) p--;
  const removed = before.slice(p, before.length - s);
  const added = after.slice(p, after.length - s);
  const clip = (x: string) => (x.length > 48 ? `${x.slice(0, 45).trim()}…` : x);
  return { removed: clip(removed.replace(/\s+/g, " ").trim()), added: clip(added.replace(/\s+/g, " ").trim()) };
}

/** Why a CAUTION recheck is CAUTION, in words (D-021: "Rechecked · Caution" with the reason). */
export function cautionRecheckReason(result: CheckResult): string {
  if (result.caps.length > 0) return "a source couldn't be read";
  const claim = mostSevereClaim(result);
  const gov = claim?.governing;
  if (claim && gov) {
    const ev = claim.evidence.find((e) => e.source.id === gov.sourceId && e.weakeners.length > 0);
    if (ev) return `${ev.source.id} is ${ev.weakeners.map((w) => WEAKENER_WORDS[w].toLowerCase()).join(", ")}`;
    const signal = claim.evidence.find((e) => (e.standing === "PROPOSAL" || e.standing === "NOT_YET_EFFECTIVE") && e.applicability === "APPLIES");
    if (signal) return `${signal.source.id} signals a change`;
  }
  return "verify it before sending";
}

/** Distinct sources across all claims, governing first. */
export function weighedSources(result: CheckResult): Array<{ ev: Evidence; governs: boolean; claim: ClaimResult }> {
  const out: Array<{ ev: Evidence; governs: boolean; claim: ClaimResult }> = [];
  const seen = new Set<string>();
  for (const claim of result.claims) {
    for (const ev of claim.evidence) {
      if (seen.has(ev.source.id)) continue;
      seen.add(ev.source.id);
      out.push({ ev, governs: claim.governing?.sourceId === ev.source.id, claim });
    }
  }
  return out.sort((a, b) => Number(b.governs) - Number(a.governs));
}

/** Short standing text for a weighed source on the Check tab. */
export function weighedStanding(ev: Evidence, governs: boolean, claim: ClaimResult): { text: string; kind: "gov" | "cand" | "prop" | "nye" | "excl" } {
  if (governs) {
    const rule = claim.governing?.via === "EXPLICIT_SUPERSESSION" ? "D5" : claim.governing?.via === "SPECIFIC_EXCEPTION" ? "D6" : "D4";
    return { text: `Governs · ${rule}`, kind: "gov" };
  }
  if (ev.standing === "EXCLUDED") return { text: "Excluded", kind: "excl" };
  if (ev.standing === "PROPOSAL") return { text: "Proposal", kind: "prop" };
  if (ev.standing === "NOT_YET_EFFECTIVE") return { text: "Not yet effective", kind: "nye" };
  if (ev.applicability === "NOT_APPLICABLE") return { text: "Doesn't apply", kind: "cand" };
  if (claim.governing && claim.governing.via !== "CONSENSUS" && ev.relation !== "n/a") {
    const v = claim.governing.value;
    const same = ev.claim.value && ev.claim.value.amount === v.amount && ev.claim.value.unit === v.unit;
    if (!same) return { text: claim.governing.via === "EXPLICIT_SUPERSESSION" ? "Superseded" : "Overridden", kind: "cand" };
  }
  if (ev.weakeners.length > 0) return { text: `Candidate · ${WEAKENER_WORDS[ev.weakeners[0] as Weakener].toLowerCase()}`, kind: "cand" };
  return { text: "Candidate", kind: "cand" };
}

export function aiModeLabel(ai: CheckResult["ai"] | null): {
  text: string;
  /** Phone-width label; the full text stays in the badge's aria-label and title. */
  short: string;
  dot: "live" | "saved" | "off" | "paused" | "none";
} {
  if (!ai) return { text: "No check yet", short: "Idle", dot: "none" };
  if (ai.paused) return { text: "Live AI paused, showing saved responses", short: "Paused", dot: "paused" };
  if (ai.mode === "live") {
    return { text: ai.fellBack ? `Live AI · via fallback (${ai.provider ?? "fallback"})` : "Live AI", short: ai.fellBack ? "Fallback" : "Live", dot: "live" };
  }
  if (ai.mode === "saved") return { text: "Saved AI response", short: "Saved", dot: "saved" };
  return { text: "AI unavailable", short: "AI off", dot: "off" };
}
