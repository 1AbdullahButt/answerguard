// SPEC Appendix B variants as workspace overrides, shared by the eval, the recorder and the guided demo.
// Bodies are derived from the seed by exact replacement, so they stay in step with data/seed.
import type { SourceOverride } from "@/lib/engine/types";
import { seedSources } from "./seed";

export type VariantId = "B1" | "B2" | "B3" | "B4" | "B5" | "B6" | "B7";

const B2_FROM = "Effective 27 Oct 2026. Approved by Head of Ops after the instant-rail settlement change.";
const B2_TO = "Proposed change, pending sign-off from Compliance. Not approved yet; do not use with customers until Bilal confirms.";
const B3_BODY = "# Reversal Timeline Update\nEffective 27 Oct 2026. Approved by Head of Ops. Failed transfers are reversed within 1 business day.\n";

function replaceOnce(body: string, from: string, to: string): string {
  if (!body.includes(from)) throw new Error(`variant: "${from}" not found in seed body`);
  return body.replace(from, to);
}

export function seedBody(id: string): string {
  const s = seedSources().find((x) => x.id === id);
  if (!s) throw new Error(`unknown source ${id}`);
  return s.body;
}

export const DOC103_BODIES = {
  B1: () => replaceOnce(seedBody("DOC-103"), "1 business day", "2 business days"),
  B2: () => replaceOnce(seedBody("DOC-103"), B2_FROM, B2_TO),
  B3: () => B3_BODY,
  B5: () => replaceOnce(seedBody("DOC-103"), "Effective 27 Oct 2026.", "Effective 1 Jan 2030."),
};

/** "Save and verify (simulated)": text changes and the source is re-verified now. */
export function verifiedSave(id: string, body: string, at: string, version = 2): SourceOverride {
  return { id, body, version, updatedAt: at, verification: "verified", verifiedAt: at };
}

/** "Save draft": text changes, verification untouched → EDITED_AFTER_VERIFICATION. */
export function draftSave(id: string, body: string, at: string, version = 2): SourceOverride {
  return { id, body, version, updatedAt: at };
}

export function variantOverrides(v: VariantId, at: string): SourceOverride[] {
  switch (v) {
    case "B1":
      return [verifiedSave("DOC-103", DOC103_BODIES.B1(), at)];
    case "B2":
      return [verifiedSave("DOC-103", DOC103_BODIES.B2(), at)];
    case "B3":
      return [verifiedSave("DOC-103", DOC103_BODIES.B3(), at)];
    case "B4":
      return [{ id: "DOC-103", deleted: true }];
    case "B5":
      return [verifiedSave("DOC-103", DOC103_BODIES.B5(), at)];
    case "B6":
      return [draftSave("DOC-101", seedBody("DOC-101"), at)];
    case "B7":
      return [draftSave("DOC-103", DOC103_BODIES.B1(), at)];
  }
}
