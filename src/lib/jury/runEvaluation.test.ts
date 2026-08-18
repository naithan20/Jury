import { MockLanguageModelV4 } from "ai/test";
import type { LanguageModelV4CallOptions, LanguageModelV4GenerateResult } from "@ai-sdk/provider";
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
 * the exported mock's `doGenerate` field. Takes the real call options
 * (notably abortSignal) so timeout tests can behave like a real fetch-based
 * provider would.
 */
let doGenerate: (
  options: LanguageModelV4CallOptions,
) => Promise<LanguageModelV4GenerateResult>;

vi.mock("./model", () => ({
  MODEL: new MockLanguageModelV4({
    doGenerate: async (options: LanguageModelV4CallOptions) => doGenerate(options),
  }),
  SELECTED_MODEL_ID: "openrouter/free",
}));

/**
 * A signal-aware slow response: resolves after `delayMs` unless aborted
 * first, exactly like a real fetch() call would behave when given a
 * signal. A plain setTimeout-based mock (no abort listener) would NOT
 * reproduce this — verified separately that it doesn't — so this is the
 * faithful way to simulate "upstream is slow" for a timeout test.
 */
function slowResult(delayMs: number, options: LanguageModelV4CallOptions) {
  return new Promise<LanguageModelV4GenerateResult>((resolve, reject) => {
    const timer = setTimeout(() => resolve(mockGenerateResult(VALID_JURY_JSON)), delayMs);
    options.abortSignal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    });
  });
}

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

describe("runJuryEvaluation invocation time budget", () => {
  it("aborts a hanging upstream call well before the total budget and returns a structured error", async () => {
    const { runJuryEvaluation } = await import("./runEvaluation");
    let calls = 0;
    doGenerate = (options) => {
      calls++;
      return slowResult(10_000, options); // "hangs" for 10s — far past the tiny budget below
    };

    const start = Date.now();
    const outcome = await runJuryEvaluation(
      { context: "dating", imageA: TINY_IMAGE, imageB: TINY_IMAGE },
      "agent",
      { totalBudgetMs: 300, minAttemptBudgetMs: 50 },
    );
    const elapsed = Date.now() - start;

    // The whole call — including the (skipped) second attempt — must
    // finish close to the 300ms budget, not anywhere near the 10s the mock
    // "upstream" would otherwise have taken.
    expect(elapsed).toBeLessThan(2000);
    expect(outcome.ok).toBe(false);
    // Attempt 1 gets aborted (not a retryable parse failure), and by then
    // the 300ms budget is spent, so attempt 2 never starts.
    expect(calls).toBe(1);
    if (!outcome.ok) {
      expect(outcome.message).not.toContain("AbortError");
      expect(outcome.message.length).toBeGreaterThan(0);
    }
  });

  it("does not start a second attempt once the remaining budget is below the minimum", async () => {
    const { runJuryEvaluation } = await import("./runEvaluation");
    let calls = 0;
    doGenerate = (options) => {
      calls++;
      // Consumes nearly the whole budget on attempt 1, then fails in a way
      // that would normally be retryable (bad JSON) — but there shouldn't
      // be enough budget left for attempt 2 to be worth starting.
      return slowResult(180, options).then(() => mockGenerateResult("not valid json {{{"));
    };

    const outcome = await runJuryEvaluation(
      { context: "dating", imageA: TINY_IMAGE, imageB: TINY_IMAGE },
      "agent",
      { totalBudgetMs: 200, minAttemptBudgetMs: 50 },
    );

    expect(calls).toBe(1);
    expect(outcome.ok).toBe(false);
  });

  it("a fast, well-behaved model still succeeds normally under the default budget", async () => {
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
});
