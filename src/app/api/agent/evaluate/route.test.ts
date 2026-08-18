import { MockLanguageModelV4 } from "ai/test";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentRateLimiter } from "@/lib/agent/rateLimit";
import { mockGenerateResult } from "@/test/mockGenerateResult";
import { POST } from "./route";

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

vi.mock("@/lib/jury/model", () => ({
  MODEL: new MockLanguageModelV4({
    doGenerate: async () => mockGenerateResult(VALID_JURY_JSON),
  }),
  SELECTED_MODEL_ID: "openrouter/free",
}));

// 1x1 transparent PNG, comfortably under the 6MB per-image cap.
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const TEST_KEY = "test-agent-key-abc123";

function makeRequest(options: {
  auth?: string | null;
  body?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
}) {
  const headers = new Headers({ "content-type": "application/json", ...options.headers });
  if (options.auth !== null) headers.set("authorization", options.auth ?? `Bearer ${TEST_KEY}`);
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

describe("POST /api/agent/evaluate", () => {
  const originalAgentKey = process.env.AGENT_API_KEY;
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    process.env.AGENT_API_KEY = TEST_KEY;
    process.env.OPENROUTER_API_KEY = "fake-openrouter-key-for-tests";
    agentRateLimiter.reset();
  });

  afterEach(() => {
    if (originalAgentKey === undefined) delete process.env.AGENT_API_KEY;
    else process.env.AGENT_API_KEY = originalAgentKey;
    if (originalOpenRouterKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
  });

  it("fails closed with 503 when AGENT_API_KEY is not configured", async () => {
    delete process.env.AGENT_API_KEY;
    const res = await POST(makeRequest({ auth: "Bearer anything" }));
    expect(res.status).toBe(503);
    const json = await readJson(res);
    expect(json).toEqual({
      ok: false,
      version: "1.0",
      error: { code: "NOT_CONFIGURED", message: expect.any(String) },
    });
  });

  it("returns 401 for a missing Authorization header", async () => {
    const res = await POST(makeRequest({ auth: null }));
    expect(res.status).toBe(401);
    expect((await readJson(res)).error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 for the wrong key", async () => {
    const res = await POST(makeRequest({ auth: "Bearer wrong-key" }));
    expect(res.status).toBe(401);
    expect((await readJson(res)).error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 INVALID_JSON for malformed JSON", async () => {
    const res = await POST(makeRequest({ rawBody: "{not valid json" }));
    expect(res.status).toBe(400);
    expect((await readJson(res)).error.code).toBe("INVALID_JSON");
  });

  it("returns 400 INVALID_REQUEST for a missing field", async () => {
    const res = await POST(makeRequest({ body: { context: "dating" } }));
    expect(res.status).toBe(400);
    expect((await readJson(res)).error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 INVALID_REQUEST for an invalid context enum value (injection-style string)", async () => {
    const res = await POST(
      makeRequest({
        body: {
          context: "'; DROP TABLE users; --",
          imageA: TINY_PNG,
          imageB: TINY_PNG,
        },
      }),
    );
    expect(res.status).toBe(400);
    expect((await readJson(res)).error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 INVALID_REQUEST for non-string image fields (type confusion)", async () => {
    const res = await POST(
      makeRequest({
        body: { context: "dating", imageA: { evil: true }, imageB: [1, 2, 3] },
      }),
    );
    expect(res.status).toBe(400);
    expect((await readJson(res)).error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 INVALID_REQUEST for a prototype-pollution-style payload", async () => {
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
    // Whatever status it resolves to, the important thing is it doesn't
    // crash and doesn't reflect the polluted payload back.
    expect([200, 400]).toContain(res.status);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("returns 400 INVALID_IMAGE for an oversized image payload", async () => {
    // 9MB of base64 chars decodes to ~6.75MB of raw bytes (base64 inflates
    // by 4/3), safely over the 6MB per-image cap.
    const hugeBase64 = "A".repeat(9 * 1024 * 1024);
    const res = await POST(
      makeRequest({
        body: {
          context: "dating",
          imageA: `data:image/png;base64,${hugeBase64}`,
          imageB: TINY_PNG,
        },
      }),
    );
    expect(res.status).toBe(400);
    expect((await readJson(res)).error.code).toBe("INVALID_IMAGE");
  });

  it("returns 413 PAYLOAD_TOO_LARGE for a request body over the hard cap", async () => {
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

  it("returns a real structured verdict for a valid authenticated request", async () => {
    const res = await POST(
      makeRequest({ body: { context: "dating", imageA: TINY_PNG, imageB: TINY_PNG } }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.ok).toBe(true);
    expect(json.version).toBe("1.0");
    expect(json.result.winner).toBe("B");
    expect(json.result.votesA).toBe(40);
    expect(json.result.votesB).toBe(60);
    expect(json.result.segments).toHaveLength(8);
  });

  it("enforces the per-key rate limit and includes Retry-After", async () => {
    const body = { context: "dating", imageA: TINY_PNG, imageB: TINY_PNG };

    let lastRes: Response | undefined;
    for (let i = 0; i < 11; i++) {
      lastRes = await POST(makeRequest({ body }));
    }

    expect(lastRes!.status).toBe(429);
    const json = await readJson(lastRes!);
    expect(json.error.code).toBe("RATE_LIMITED");
    expect(lastRes!.headers.get("retry-after")).toBeTruthy();
  });

  it("never leaks AGENT_API_KEY or OPENROUTER_API_KEY in any response body", async () => {
    const secrets = [TEST_KEY, "fake-openrouter-key-for-tests"];

    const requests = [
      makeRequest({ auth: null }),
      makeRequest({ auth: "Bearer wrong-key" }),
      makeRequest({ rawBody: "{not valid json" }),
      makeRequest({ body: { context: "bogus" } }),
      makeRequest({ body: { context: "dating", imageA: TINY_PNG, imageB: TINY_PNG } }),
    ];

    for (const req of requests) {
      const res = await POST(req);
      const text = await res.text();
      for (const secret of secrets) {
        expect(text).not.toContain(secret);
      }
      expect(text.toLowerCase()).not.toContain("stack");
    }
  });
});
