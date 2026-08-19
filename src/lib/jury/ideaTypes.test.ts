import { describe, expect, it } from "vitest";
import { ideaResultSchema } from "./ideaTypes";

const basePanel = [
  { persona: "bold", stance: "supportive" as const, note: "x" },
  { persona: "reserved", stance: "skeptical" as const, note: "x" },
  { persona: "social", stance: "mixed" as const, note: "x" },
  { persona: "analytical", stance: "skeptical" as const, note: "x" },
  { persona: "status", stance: "supportive" as const, note: "x" },
  { persona: "trust", stance: "mixed" as const, note: "x" },
  { persona: "aesthetic", stance: "supportive" as const, note: "x" },
  { persona: "warmth", stance: "mixed" as const, note: "x" },
];

function baseResult(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    verdict: "A plausible idea with real execution risk but a credible upside.",
    recommendation: "pursue_with_changes",
    confidence: "medium",
    confidenceNote: "Reasonable evidence, but key unknowns remain.",
    panel: basePanel,
    argumentsFor: ["Clear demand signal."],
    argumentsAgainst: ["Crowded market."],
    disagreements: ["Analytical and bold disagree on timing."],
    overlookedRisks: ["Regulatory exposure."],
    overlookedOpportunities: ["Adjacent market."],
    nextSteps: ["Run a small pilot."],
    keyUnknowns: ["True willingness to pay."],
    ...overrides,
  };
}

describe("ideaResultSchema tightened bounds (post prod-health-check trim)", () => {
  it("accepts the minimum (1 item) for every bounded array", () => {
    const result = ideaResultSchema.safeParse(baseResult());
    expect(result.success).toBe(true);
  });

  it("rejects an empty array for any bounded field", () => {
    for (const field of ["argumentsFor", "argumentsAgainst", "disagreements", "overlookedRisks", "overlookedOpportunities", "nextSteps", "keyUnknowns"]) {
      const result = ideaResultSchema.safeParse(baseResult({ [field]: [] }));
      expect(result.success, `${field} should reject an empty array`).toBe(false);
    }
  });

  it.each([
    ["argumentsFor", 3],
    ["argumentsAgainst", 3],
    ["nextSteps", 3],
    ["keyUnknowns", 3],
  ])("accepts up to %s items for %s (new tightened max)", (field, max) => {
    const result = ideaResultSchema.safeParse(baseResult({ [field]: Array(max).fill("A concise point.") }));
    expect(result.success).toBe(true);
  });

  it.each([
    ["argumentsFor", 3],
    ["argumentsAgainst", 3],
    ["nextSteps", 3],
    ["keyUnknowns", 3],
  ])("rejects more than %s items for %s (was 5, now tightened)", (field, max) => {
    const result = ideaResultSchema.safeParse(
      baseResult({ [field]: Array(max + 1).fill("A concise point.") }),
    );
    expect(result.success).toBe(false);
  });

  it.each([
    ["disagreements", 2],
    ["overlookedRisks", 2],
    ["overlookedOpportunities", 2],
  ])("accepts up to %s items for %s (new tightened max)", (field, max) => {
    const result = ideaResultSchema.safeParse(baseResult({ [field]: Array(max).fill("A concise point.") }));
    expect(result.success).toBe(true);
  });

  it.each([
    ["disagreements", 2],
    ["overlookedRisks", 2],
    ["overlookedOpportunities", 2],
  ])("rejects more than %s items for %s (was 4, now tightened)", (field, max) => {
    const result = ideaResultSchema.safeParse(
      baseResult({ [field]: Array(max + 1).fill("A concise point.") }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts a 140-character item in a bounded array but rejects 141", () => {
    const ok = ideaResultSchema.safeParse(baseResult({ argumentsFor: ["x".repeat(140)] }));
    expect(ok.success).toBe(true);
    const tooLong = ideaResultSchema.safeParse(baseResult({ argumentsFor: ["x".repeat(141)] }));
    expect(tooLong.success).toBe(false);
  });

  it("accepts a 140-character panel note but rejects 141 (was 200)", () => {
    const okPanel = basePanel.map((p, i) => (i === 0 ? { ...p, note: "x".repeat(140) } : p));
    expect(ideaResultSchema.safeParse(baseResult({ panel: okPanel })).success).toBe(true);

    const tooLongPanel = basePanel.map((p, i) => (i === 0 ? { ...p, note: "x".repeat(141) } : p));
    expect(ideaResultSchema.safeParse(baseResult({ panel: tooLongPanel })).success).toBe(false);
  });

  it("still requires exactly 8 panel entries", () => {
    const result = ideaResultSchema.safeParse(baseResult({ panel: basePanel.slice(0, 7) }));
    expect(result.success).toBe(false);
  });
});
