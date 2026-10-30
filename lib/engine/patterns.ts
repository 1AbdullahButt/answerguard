// Deterministic policy-pattern detector (SPEC §6.6.2). "Nothing found" by the AI is never proof of safety:
// if this detector fires on a draft the AI returned no in-scope claim for, the result is EXTRACTION_GAP.
import type { PatternMatch } from "./types";

const NUMBER = String.raw`(?:\d+(?:[.,]\d+)?(?:\s*[-–—]\s*\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|same)`;

const DETECTORS: Array<{ kind: PatternMatch["kind"]; re: RegExp }> = [
  {
    kind: "duration",
    re: new RegExp(String.raw`\b${NUMBER}[\s-]*(?:business |working |calendar )?(?:day|days|hour|hours|week|weeks)\b`, "gi"),
  },
  { kind: "relative_time", re: /\b(?:same day|today|tomorrow|within|by end of)\b/gi },
  {
    kind: "currency",
    re: /(?:[$€£₹]\s?\d[\d,]*(?:\.\d+)?|\b(?:usd|eur|gbp|pkr|rs\.?)\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s?(?:usd|eur|gbp|pkr|dollars?|euros?|pounds?|rupees?)\b)/gi,
  },
];

/** All detector hits in `text`, ordered by position. Overlapping hits of different kinds are all kept. */
export function detectPolicyPatterns(text: string): PatternMatch[] {
  const out: PatternMatch[] = [];
  for (const { kind, re } of DETECTORS) {
    for (const m of text.matchAll(re)) {
      if (m.index !== undefined) out.push({ text: m[0], index: m.index, kind });
    }
  }
  return out.sort((a, b) => a.index - b.index || b.text.length - a.text.length);
}

/** Digits or day/hour words: the ESCALATE template must contain none of these (SPEC §6.7). */
export function hasTimelineWords(text: string): boolean {
  return /\d/.test(text) || /\b(?:day|days|hour|hours|week|weeks|today|tomorrow)\b/i.test(text);
}
