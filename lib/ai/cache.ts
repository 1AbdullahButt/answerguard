import { notImplemented } from "@/lib/notImplemented";
import type { Decision, Value } from "@/lib/engine/types";

/** Full cache identity (SPEC §10, plus provider per DECISIONS.md D-001). */
export interface CacheIdentity {
  task: "source_extraction" | "draft_extraction" | "safe_reply";
  promptVersion: string;
  schemaVersion: string;
  provider: string;
  model: string;
  inputText: string;
  /** source_extraction only */
  sourceKind?: string;
  /** safe_reply only */
  governing?: { value: Value; quote: string; decision: Decision };
}

/** On-disk format of a saved AI response in data/ai-cache/<key>.json. */
export interface CacheFile {
  key: string;
  identity: CacheIdentity;
  output: unknown;
  recordedAt: string;
}

/** sha256 (hex) of a canonical JSON of the identity (key order independent). */
export function cacheKey(_identity: CacheIdentity): string {
  return notImplemented("cacheKey");
}

export interface AiCache {
  /** In-memory LRU first, then `<dir>/<key>.json`. Returns undefined on a miss or an identity mismatch. */
  get(identity: CacheIdentity): unknown | undefined;
  /** Stores in memory only. */
  set(identity: CacheIdentity, output: unknown): void;
  /** Writes `<dir>/<key>.json` (used by `pnpm record`). */
  save(identity: CacheIdentity, output: unknown): void;
}

export function createAiCache(_opts: { dir?: string; maxEntries?: number } = {}): AiCache {
  return notImplemented("createAiCache");
}
