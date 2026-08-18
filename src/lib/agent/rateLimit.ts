export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  reset(): void;
}

/**
 * In-memory sliding-window limiter. This is deliberately simple and
 * deliberately NOT a distributed limiter: on Vercel, each warm serverless
 * instance holds its own memory, so this is best-effort per-instance
 * throttling, not a hard global guarantee. It's still a genuine, free,
 * zero-infrastructure defense against a single misbehaving caller (or
 * agent) hammering the endpoint and burning through the shared OpenRouter
 * free-tier quota (20 req/min, 50 req/day) that the human UI also depends
 * on. A true cross-instance limit would need a shared store (e.g. Upstash
 * Redis / Vercel KV) — worth adding later if agent traffic grows enough
 * for that gap to matter.
 */
export function createRateLimiter({
  limit,
  windowMs,
  now = () => Date.now(),
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    check(key: string): RateLimitResult {
      const t = now();
      const windowStart = t - windowMs;
      const existing = (hits.get(key) ?? []).filter((ts) => ts > windowStart);

      if (existing.length >= limit) {
        const oldest = existing[0];
        const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - t) / 1000));
        hits.set(key, existing);
        return { allowed: false, retryAfterSeconds };
      }

      existing.push(t);
      hits.set(key, existing);
      return { allowed: true };
    },
    reset() {
      hits.clear();
    },
  };
}

// Shared singleton for the agent endpoint: 10 requests per 10 minutes per
// API key. Well within OpenRouter's free-tier ceiling, leaving generous
// headroom for real human traffic through the browser UI.
export const agentRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 10 * 60 * 1000,
});
