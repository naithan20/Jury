import { MockLanguageModelV4 } from "ai/test";
import type { LanguageModelV4GenerateResult } from "@ai-sdk/provider";
import { describe, expect, it, vi } from "vitest";
import { mockGenerateResult } from "@/test/mockGenerateResult";

const VALID_JURY_JSON = JSON.stringify({
  votesA: 50,
  votesB: 50,
  confidence: "low",
  confidenceNote: "Genuinely close.",
  winReason: "Marginally stronger composition.",
  loseReason: "Marginally weaker lighting.",
  loserStrength: "A warmer expression.",
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

const TINY_IMAGE = { mediaType: "image/png", base64: "aGVsbG8=" };

/**
 * Every test here reassigns the mocked MODEL's doGenerate per-test, so the
 * module is mocked once with a placeholder and each test overrides it via
 * the exported mock's `doGenerate` field.
 */
let doGenerate: () => Promise<LanguageModelV4GenerateResult>;

vi.mock("./model", () => ({
  MODEL: new MockLanguageModelV4({
    doGenerate: async () => doGenerate(),
  }),
  SELECTED_MODEL_ID: "openrouter/free",
}));

describe("runJuryEvaluation cost/retry bound", () => {
  it("makes exactly one call and succeeds when the model returns valid JSON immediately", async () => {
    const { runJuryEvaluation } = await import("./runEvaluation");
    let calls = 0;
    doGenerate = async () => {
      calls++;
      return mockGenerateResult(VALID_JURY_JSON);
    };

    const outcome = await runJuryEvaluation(
      { context: "dating", imageA: TINY_IMAGE, imageB: TINY_IMAGE },
      "agent",
    );

    expect(calls).toBe(1);
    expect(outcome.ok).toBe(true);
  });

  it("retries exactly once on a genuine parse failure, then succeeds", async () => {
    const { runJuryEvaluation } = await import("./runEvaluation");
    let calls = 0;
    doGenerate = async () => {
      calls++;
      return mockGenerateResult(
        calls === 1 ? "this is not valid json at all {{{" : VALID_JURY_JSON,
      );
    };

    const outcome = await runJuryEvaluation(
      { context: "dating", imageA: TINY_IMAGE, imageB: TINY_IMAGE },
      "agent",
    );

    expect(calls).toBe(2);
    expect(outcome.ok).toBe(true);
  });

  it("never exceeds 2 total model calls even when every attempt fails to parse", async () => {
    const { runJuryEvaluation } = await import("./runEvaluation");
    let calls = 0;
    doGenerate = async () => {
      calls++;
      return mockGenerateResult("still not json ((((");
    };

    const outcome = await runJuryEvaluation(
      { context: "dating", imageA: TINY_IMAGE, imageB: TINY_IMAGE },
      "agent",
    );

    expect(calls).toBe(2);
    expect(outcome.ok).toBe(false);
  });

  it("does not retry a non-retryable (e.g. auth) failure — exactly 1 call", async () => {
    const { runJuryEvaluation } = await import("./runEvaluation");
    let calls = 0;
    doGenerate = async () => {
      calls++;
      throw new Error("Unauthenticated request to the provider.");
    };

    const outcome = await runJuryEvaluation(
      { context: "dating", imageA: TINY_IMAGE, imageB: TINY_IMAGE },
      "agent",
    );

    expect(calls).toBe(1);
    expect(outcome.ok).toBe(false);
  });
});
