// localStorage wrapped in try/catch with an in-memory fallback (SPEC §9). Private mode, quota errors and
// disabled storage all degrade to memory for this tab.
const memory = new Map<string, string>();

export function readJson<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    raw = null;
  }
  if (raw === null) raw = memory.get(key) ?? null;
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    // the memory fallback already holds it
  }
}

export function removeKey(key: string): void {
  memory.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
