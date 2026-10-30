// Text and value normalization shared by quote validation, supersession matching and value comparison.
import type { Value } from "./types";

type DefinedValue = NonNullable<Value>;

const DASHES = /[‐-―−﹘﹣－]/g;
const SINGLE_QUOTES = /[‘’‚‛′]/g;
const DOUBLE_QUOTES = /[“”„‟″]/g;

/**
 * Normalization for verbatim-quote checks (SPEC §6.2, DECISIONS D-002.2): NFKC, dash and quote variants folded,
 * whitespace collapsed. The check stays a strict substring test on the result.
 */
export function normalizeText(s: string): string {
  return s
    .normalize("NFKC")
    .replace(DASHES, "-")
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** True when `quote` is a non-empty verbatim substring of `text` after normalization. */
export function isVerbatim(quote: string, text: string): boolean {
  const q = normalizeText(quote);
  return q.length > 0 && normalizeText(text).includes(q);
}

/** Loose form for naming matches (DECISIONS D-002.6): lowercase, every non-alphanumeric run becomes one space. */
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Deterministic containment used by D5 condition 3. */
export function namesSource(targetText: string, source: { id: string; title: string }): boolean {
  const target = ` ${normalizeForMatch(targetText)} `;
  return [source.title, source.id].some((name) => {
    const n = normalizeForMatch(name);
    return n.length > 0 && target.includes(` ${n} `);
  });
}

export function range(v: DefinedValue): [number, number] {
  const lo = v.amount;
  const hi = v.amountMax ?? v.amount;
  return lo <= hi ? [lo, hi] : [hi, lo];
}

/** Same amount range and same unit. Used by D1 and D4 ("agree"). */
export function sameValue(a: DefinedValue, b: DefinedValue): boolean {
  const [alo, ahi] = range(a);
  const [blo, bhi] = range(b);
  return a.unit === b.unit && alo === blo && ahi === bhi;
}

/** `inner`'s amount range lies inside `outer`'s, ignoring units (callers check units separately). */
export function amountWithin(inner: DefinedValue, outer: DefinedValue): boolean {
  const [ilo, ihi] = range(inner);
  const [olo, ohi] = range(outer);
  return ilo >= olo && ihi <= ohi;
}

const UNIT_WORDS: Record<DefinedValue["unit"], [string, string]> = {
  business_days: ["business day", "business days"],
  calendar_days: ["calendar day", "calendar days"],
  hours: ["hour", "hours"],
};

/** "1 business day", "4 business days", "5–7 calendar days". */
export function formatValue(v: DefinedValue): string {
  const [lo, hi] = range(v);
  const [one, many] = UNIT_WORDS[v.unit];
  if (lo !== hi) return `${lo}–${hi} ${many}`;
  return `${lo} ${lo === 1 ? one : many}`;
}

/** "27 Oct 2026" from an ISO date; returns the input unchanged if it doesn't parse. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function parseTime(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}
