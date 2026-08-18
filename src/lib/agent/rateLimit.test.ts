import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows requests up to the limit and then blocks", () => {
    const now = 0;
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000, now: () => now });

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    const blocked = limiter.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => now });

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(false);
  });

  it("allows requests again once the window has passed", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => now });

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);

    now = 1001;
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("reset() clears all tracked state", () => {
    const now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => now });

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);

    limiter.reset();
    expect(limiter.check("a").allowed).toBe(true);
  });
});
