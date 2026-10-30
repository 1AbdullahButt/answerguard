// Client edits arrive as overrides and are merged onto the seed (SPEC §9).
// Visibility, kind, title and IDs can never be overridden; overrides for unknown IDs are ignored.
import type { Source, SourceOverride } from "@/lib/engine/types";

export const MAX_DOC_CHARS = 4000;
export const MAX_SOURCES_PER_CHECK = 6;

export function mergeOverrides(seed: Source[], overrides: SourceOverride[] = []): Source[] {
  const byId = new Map(overrides.map((o) => [o.id, o]));
  const out: Source[] = [];
  for (const s of seed) {
    const o = byId.get(s.id);
    if (!o) {
      out.push(s);
      continue;
    }
    if (o.deleted) continue;
    out.push({
      ...s,
      body: o.body !== undefined ? o.body.slice(0, MAX_DOC_CHARS) : s.body,
      version: o.version ?? s.version,
      updatedAt: o.updatedAt ?? s.updatedAt,
      verification: o.verification ?? s.verification,
      verifiedAt: o.verifiedAt !== undefined ? o.verifiedAt : s.verifiedAt,
      flaggedOutdated: o.flaggedOutdated ?? s.flaggedOutdated,
      owner: s.owner && o.ownerActive !== undefined ? { ...s.owner, active: o.ownerActive } : s.owner,
    });
  }
  return out;
}
