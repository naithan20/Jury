import { MockLanguageModelV4 } from "ai/test";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { mockGenerateResult } from "@/test/mockGenerateResult";
import { POST } from "./route";

const VALID_JURY_JSON = JSON.stringify({
  votesA: 30,
  votesB: 70,
  confidence: "high",
  confidenceNote: "A clear lean.",
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

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/jury", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Backward-compatibility guard: the human-facing route's request/response
 * contract must stay exactly as it was before /api/agent/evaluate was
 * introduced, and it must remain reachable with no Authorization header at
 * all (the browser UI never sends one).
 */
describe("POST /api/jury (human UI — unauthenticated by design)", () => {
  it("requires no Authorization header and returns the unwrapped { result } shape", async () => {
    const res = await POST(makeRequest({ context: "dating", imageA: TINY_PNG, imageB: TINY_PNG }));
    expect(res.status).toBe(200);
    const json = await res.json();
    // Note: no `ok`/`version` envelope here — that's specific to the new
    // agent contract and must not leak into the existing UI contract.
    expect(json).toHaveProperty("result");
    expect(json.result.winner).toBe("B");
    expect(json.result.votesA).toBe(30);
    expect(json.result.votesB).toBe(70);
  });

  it("returns the original { error } shape (not the agent's { ok, error } shape) on invalid input", async () => {
    const res = await POST(makeRequest({ context: "not-a-real-context" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: expect.any(String) });
    expect(json.ok).toBeUndefined();
  });
});
