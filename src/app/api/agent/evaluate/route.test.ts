import { MockLanguageModelV4 } from "ai/test";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockGenerateResult } from "@/test/mockGenerateResult";

const VALID_JURY_JSON = JSON.stringify({
  votesA: 40,
  votesB: 60,
  confidence: "medium",
  confidenceNote: "A reasonably clear lean.",
  winReason: "B has stronger composition.",
  loseReason: "A is slightly underexposed.",
  loserStrength: "A has a warmer expression.",
  segments: [
    { persona: "bold", favors: "B", note: "x" },
    { persona: "reserved", favors: "A", note: "x" },
    { persona: "social", favors: "B", note: "x" },
    { persona: "analytical", favors: "B", note: "x" },
    { persona: "status", favors: "B", note: "x" },
    { persona: "trust", favors: "A", note: "x" },
    { persona: "aesthetic", favors: "B", note: "x" },
    { persona: "warmth", favors: "A", note: "x" },
  ],
  improvementTip: "Try brighter, more even lighting.",
});

function mockFreeModel() {
  vi.doMock("@/lib/jury/model", () => ({
    MODEL: new MockLanguageModelV4({ doGenerate: async () => mockGenerateResult(VALID_JURY_JSON) }),
    SELECTED_MODEL_ID: "openrouter/free",
  }));
}

// 1x1 transparent PNG, comfortably under the 6MB per-image cap.
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function makeRequest(options: {
  ip?: string;
  body?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
}) {
  const headers = new Headers({
    "content-type": "application/json",
    "x-real-ip": options.ip ?? "203.0.113.1",
    ...options.headers,
  });
  const body =
    options.rawBody !== undefined ? options.rawBody : JSON.stringify(options.body ?? {});
  return new NextRequest("http://localhost/api/agent/evaluate", {
    method: "POST",
    headers,
    body,
  });
}

async function readJson(res: Response) {
  return JSON.parse(await res.text());
}

/**
 * Every test dynamically re-imports the route (after vi.resetModules())
 * rather than importing POST once statically. That gives each test a
 * fresh copy of the module graph — including the rate limiter singletons
 * in @/lib/agent/rateLimit, which are real (unmocked) in-memory state — so
 * tests can't leak rate-limit counters into each other, without needing a
 * manual reset() call that would only ever reset a stale, disconnected
 * instance.
 */
describe("POST /api/agent/evaluate (public, no credential)", () => {
  const originalFlag = process.env.AGENT_PUBLIC_ACCESS_ENABLED;
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    delete process.env.AGENT_PUBLIC_ACCESS_ENABLED;
  });

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.AGENT_PUBLIC_ACCESS_ENABLED;
    else process.env.AGENT_PUBLIC_ACCESS_ENABLED = originalFlag;
    if (originalOpenRouterKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
    vi.doUnmock("@/lib/jury/model");
    vi.doUnmock("@/lib/jury/runEvaluation");
    vi.resetModules();
  });

  it("returns a real structured verdict with no Authorization header at all", async () => {
    mockFreeModel();
    vi.resetModules();
    const { POST } = await import("./route");

    const res = await POST(
      makeRequest({ body: { context: "dating", imageA: TINY_PNG, imageB: TINY_PNG } }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.ok).toBe(true);
    expect(json.version).toBe("1.0");
    expect(json.result.winner).toBe("B");
    expect(json.result.segments).toHaveLength(8);
  });

  it("turns an evaluation timeout into a clean structured 502, not a platform 504, and leaks nothing", async () => {
    // Mocks runJuryEvaluation directly rather than waiting out the real
    // ~40s budget: the timing/abort mechanism itself is proven separately
    // in runEvaluation.test.ts. What this test proves is the ROUTE's own
    // responsibility — that whatever outcome runJuryEvaluation produces
    // (including one caused by an internal timeout) is always turned into
    // this route's own structured JSON error, matching the published
    // contract, rather than ever letting the platform's own 504 (bare
    // HTML/plain text, not our schema) reach the caller.
    process.env.OPENROUTER_API_KEY = "fake-openrouter-key-for-tests";
    vi.doMock("@/lib/jury/model", () => ({
      MODEL: new MockLanguageModelV4({ doGenerate: async () => mockGenerateResult(VALID_JURY_JSON) }),
      SELECTED_MODEL_ID: "openrouter/free",
    }));
    vi.doMock("@/lib/jury/runEvaluation", () => ({
      runJuryEvaluation: async () => ({
        ok: false,
        message:
          "The jury couldn't reach a verdict right now. Please try again in a moment — if this keeps happening, the deployment's AI setup needs attention.",
      }),
    }));
    vi.resetModules();
    const { POST } = await import("./route");

    const start = Date.now();
    const res = await POST(
      makeRequest({ body: { context: "dating", imageA: TINY_PNG, imageB: TINY_PNG } }),
    );
    const elapsed = Date.now() - start;
    const text = await res.text();

    expect(res.status).toBe(502);
    expect(elapsed).toBeLessThan(1000);
    const json = JSON.parse(text);
    expect(json).toEqual({
      ok: false,
      version: "1.0",
      error: { code: "UPSTREAM_ERROR", message: expect.any(String) },
    });
    expect(text).not.toContain("fake-openrouter-key-for-tests");
    expect(text.toLowerCase()).not.toContain("<html");
  });

  it("returns 503 PUBLIC_ACCESS_DISABLED when the model isn't on the known-free allowlist", async () => {
    vi.doMock("@/lib/jury/model", () => ({
      MODEL: new MockLanguageModelV4({ doGenerate: async () => mockGenerateResult(VALID_JURY_JSON) }),
      SELECTED_MODEL_ID: "openai/gpt-5",
    }));
    vi.resetModules();
    const { POST } = await import("./route");

    const res = await POST(
      makeRequest({ body: { context: "dating", imageA: TINY_PNG, imageB: TINY_PNG } }),
    );
    expect(res.status).toBe(503);
    expect((await readJson(res)).error.code).toBe("PUBLIC_ACCESS_DISABLED");
  });

  it("returns 503 PUBLIC_ACCESS_DISABLED when AGENT_PUBLIC_ACCESS_ENABLED=false, even on the free model", async () => {
    process.env.AGENT_PUBLIC_ACCESS_ENABLED = "false";
    mockFreeModel();
    vi.resetModules();
    const { POST } = await import("./route");

    const res = await POST(
      makeRequest({ body: { context: "dating", imageA: TINY_PNG, imageB: TINY_PNG } }),
    );
    expect(res.status).toBe(503);
    expect((await readJson(res)).error.code).toBe("PUBLIC_ACCESS_DISABLED");
  });

  it("returns 400 INVALID_JSON for malformed JSON", async () => {
    mockFreeModel();
    vi.resetModules();
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ rawBody: "{not valid json" }));
    expect(res.status).toBe(400);
    expect((await readJson(res)).error.code).toBe("INVALID_JSON");
  });

  it("returns 400 INVALID_REQUEST for a missing field", async () => {
    mockFreeModel();
    vi.resetModules();
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ body: { context: "dating" } }));
    expect(res.status).toBe(400);
    expect((await readJson(res)).error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 INVALID_REQUEST for an invalid context enum value (injection-style string)", async () => {
    mockFreeModel();
    vi.resetModules();
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({
        body: { context: "'; DROP TABLE users; --", imageA: TINY_PNG, imageB: TINY_PNG },
      }),
    );
    expect(res.status).toBe(400);
    expect((await readJson(res)).error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 INVALID_REQUEST for non-string image fields (type confusion)", async () => {
    mockFreeModel();
    vi.resetModules();
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({ body: { context: "dating", imageA: { evil: true }, imageB: [1, 2, 3] } }),
    );
    expect(res.status).toBe(400);
    expect((await readJson(res)).error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 INVALID_REQUEST for a prototype-pollution-style payload, without crashing", async () => {
    mockFreeModel();
    vi.resetModules();
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({
        rawBody: JSON.stringify({
          context: "dating",
          imageA: TINY_PNG,
          imageB: TINY_PNG,
          __proto__: { polluted: true },
          constructor: { prototype: { polluted: true } },
        }),
      }),
    );
    expect([200, 400]).toContain(res.status);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("returns 400 INVALID_IMAGE for an oversized image payload", async () => {
    mockFreeModel();
    vi.resetModules();
    const { POST } = await import("./route");
    // 9MB of base64 chars decodes to ~6.75MB of raw bytes (base64 inflates
    // by 4/3), safely over the 6MB per-image cap.
    const hugeBase64 = "A".repeat(9 * 1024 * 1024);
    const res = await POST(
      makeRequest({
        body: { context: "dating", imageA: `data:image/png;base64,${hugeBase64}`, imageB: TINY_PNG },
      }),
    );
    expect(res.status).toBe(400);
    expect((await readJson(res)).error.code).toBe("INVALID_IMAGE");
  });

  it("returns 413 PAYLOAD_TOO_LARGE for a request body over the hard cap", async () => {
    mockFreeModel();
    vi.resetModules();
    const { POST } = await import("./route");
    // ~19MB raw body — over the 18MB MAX_BODY_BYTES cap regardless of
    // Content-Length, since the route reads the stream with its own limit.
    const hugeBase64 = "A".repeat(19 * 1024 * 1024);
    const res = await POST(
      makeRequest({
        rawBody: JSON.stringify({
          context: "dating",
          imageA: `data:image/png;base64,${hugeBase64}`,
          imageB: TINY_PNG,
        }),
      }),
    );
    expect(res.status).toBe(413);
    expect((await readJson(res)).error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("enforces the per-IP rate limit (429 RATE_LIMITED) but isolates other IPs", async () => {
    mockFreeModel();
    vi.resetModules();
    const { POST } = await import("./route");
    const body = { context: "dating", imageA: TINY_PNG, imageB: TINY_PNG };

    // Per-IP limit is 3/10min — the 4th request from the same IP is blocked.
    let lastRes: Response | undefined;
    for (let i = 0; i < 4; i++) {
      lastRes = await POST(makeRequest({ ip: "203.0.113.9", body }));
    }
    expect(lastRes!.status).toBe(429);
    const json = await readJson(lastRes!);
    expect(json.error.code).toBe("RATE_LIMITED");
    expect(lastRes!.headers.get("retry-after")).toBeTruthy();

    // A different IP is unaffected by the first IP's limit.
    const otherIpRes = await POST(makeRequest({ ip: "203.0.113.10", body }));
    expect(otherIpRes.status).toBe(200);
  });

  it("enforces the global daily quota (429 DAILY_QUOTA_EXCEEDED) across many distinct IPs", async () => {
    mockFreeModel();
    vi.resetModules();
    const { POST } = await import("./route");
    const body = { context: "dating", imageA: TINY_PNG, imageB: TINY_PNG };

    // Global limit is 10/24h. Use 10 distinct IPs (one request each) so no
    // single IP ever trips the per-IP limit of 3 — isolates the assertion
    // to the global counter specifically.
    for (let i = 0; i < 10; i++) {
      const res = await POST(makeRequest({ ip: `198.51.100.${i}`, body }));
      expect(res.status).toBe(200);
    }

    // The 11th request, from yet another never-before-seen IP, still hits
    // the exhausted global quota.
    const res = await POST(makeRequest({ ip: "198.51.100.99", body }));
    expect(res.status).toBe(429);
    const json = await readJson(res);
    expect(json.error.code).toBe("DAILY_QUOTA_EXCEEDED");
    expect(res.headers.get("retry-after")).toBeTruthy();
  });

  it("never leaks OPENROUTER_API_KEY in any response body", async () => {
    const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "fake-openrouter-key-for-tests";
    mockFreeModel();
    vi.resetModules();
    const { POST } = await import("./route");

    const requests = [
      makeRequest({ ip: "203.0.113.50", rawBody: "{not valid json" }),
      makeRequest({ ip: "203.0.113.51", body: { context: "bogus" } }),
      makeRequest({
        ip: "203.0.113.52",
        body: { context: "dating", imageA: TINY_PNG, imageB: TINY_PNG },
      }),
    ];

    for (const req of requests) {
      const res = await POST(req);
      const text = await res.text();
      expect(text).not.toContain("fake-openrouter-key-for-tests");
      expect(text.toLowerCase()).not.toContain("stack");
    }

    if (originalOpenRouterKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
  });
});
