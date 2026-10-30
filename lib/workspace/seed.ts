// Seed data lives on the server (SPEC §9). Read once per process from data/seed.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Source, Ticket } from "@/lib/engine/types";

type SeedSourceMeta = Omit<Source, "body"> & { bodyFile: string };

const SEED_DIR = path.join(process.cwd(), "data", "seed");

let cache: { sources: Source[]; tickets: Ticket[] } | null = null;

function load(): { sources: Source[]; tickets: Ticket[] } {
  if (cache) return cache;
  const meta = JSON.parse(readFileSync(path.join(SEED_DIR, "sources.json"), "utf8")) as SeedSourceMeta[];
  const sources = meta.map(({ bodyFile, ...rest }) => ({
    ...rest,
    body: readFileSync(path.join(SEED_DIR, "docs", bodyFile), "utf8").replace(/\r\n/g, "\n"),
  }));
  const tickets = JSON.parse(readFileSync(path.join(SEED_DIR, "tickets.json"), "utf8")) as Ticket[];
  cache = { sources, tickets };
  return cache;
}

/** Fresh copies, so callers can never mutate the seed. */
export function seedSources(): Source[] {
  return load().sources.map((s) => ({ ...s, owner: s.owner ? { ...s.owner } : null }));
}

export function seedTickets(): Ticket[] {
  return load().tickets.map((t) => ({ ...t }));
}
