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

// The agent endpoint has no credential to key a limiter on (see
// publicAccessGuard.ts for why), so it uses two independent in-memory
// limiters instead — both best-effort/per-instance, not a distributed
// guarantee (see the class doc above):
//
// - Per-IP: stops one source from burning the whole daily quota alone.
// - Global: caps total public-agent traffic regardless of source, so this
//   surface can't crowd out the human UI's share of the shared OpenRouter
//   free-tier ceiling (20 req/min, 50 req/day project-wide). Deliberately
//   a small number for this first dogfood phase — see AGENTS_README or the
//   route for the exact figure.
//
// Neither of these is the actual safety boundary against runaway cost:
// openrouter/free is $0 regardless of call volume, and OpenRouter's own
// infrastructure enforces the 50/day ceiling no matter what happens here.
// These limiters exist to be a good citizen toward that shared quota, not
// to prevent a bill.
export const agentPerIpLimiter = createRateLimiter({
  limit: 3,
  windowMs: 10 * 60 * 1000,
});

export const agentGlobalLimiter = createRateLimiter({
  limit: 10,
  windowMs: 24 * 60 * 60 * 1000,
});

export const AGENT_GLOBAL_QUOTA_KEY = "global";
