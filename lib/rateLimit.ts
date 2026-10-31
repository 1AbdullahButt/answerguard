// Layered limits on live AI (SPEC §10): a shared Upstash limiter (per IP + global daily cap) when configured,
// otherwise a best-effort in-memory limiter that is NOT shared across serverless instances.
// A denied request still works: it uses saved responses and shows "Live AI paused".
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const perIpLimit = () => Number(process.env.RATE_LIMIT_PER_10MIN ?? 20);
const dailyLimit = () => Number(process.env.GLOBAL_LIVE_CHECKS_PER_DAY ?? 500);

export type LimiterKind = "upstash" | "memory";

interface Limiter {
  kind: LimiterKind;
  allow(ip: string): Promise<boolean>;
}

function upstashLimiter(url: string, token: string): Limiter {
  const redis = new Redis({ url, token });
  const perIp = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(perIpLimit(), "10 m"), prefix: "suresend:ip" });
  const global = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(dailyLimit(), "1 d"), prefix: "suresend:global" });
  const fallback = memoryLimiter();
  return {
    kind: "upstash",
    async allow(ip) {
      try {
        const ipOk = (await perIp.limit(ip)).success;
        if (!ipOk) return false;
        return (await global.limit("all")).success;
      } catch {
        return fallback.allow(ip); // Redis unreachable: best effort rather than unlimited
      }
    },
  };
}

function memoryLimiter(): Limiter {
  const hits = new Map<string, number[]>();
  let day = "";
  let dayCount = 0;
  return {
    kind: "memory",
    async allow(ip) {
      const now = Date.now();
      const today = new Date(now).toISOString().slice(0, 10);
      if (today !== day) {
        day = today;
        dayCount = 0;
      }
      const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
      if (recent.length >= perIpLimit() || dayCount >= dailyLimit()) {
        hits.set(ip, recent);
        return false;
      }
      recent.push(now);
      hits.set(ip, recent);
      dayCount++;
      return true;
    },
  };
}

let limiter: Limiter | null = null;

export function getLimiter(): Limiter {
  if (limiter) return limiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  limiter = url && token ? upstashLimiter(url, token) : memoryLimiter();
  return limiter;
}

/** One unit per check that needs live AI (cache hits never reach this). */
export function allowLiveCheck(ip: string): Promise<boolean> {
  return getLimiter().allow(ip);
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
