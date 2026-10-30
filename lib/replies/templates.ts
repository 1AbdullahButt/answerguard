// Safe-reply templates (SPEC §6.7). Never say or imply a reversal has already started or finished.
import { formatValue } from "@/lib/engine/normalize";
import type { Value } from "@/lib/engine/types";

export function holdTemplate(v: NonNullable<Value>): string {
  return `For transfers on this payment type, the current policy gives a reversal window of ${formatValue(v)}.`;
}

/** No timeline, and nothing implying anything has happened yet. Asserted timeline-free in runCheck. */
export const ESCALATE_TEMPLATE =
  "Thanks for your patience. I'm confirming the exact reversal timeline for your transfer and will update you here as soon as I have it.";
