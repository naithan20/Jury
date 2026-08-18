import type { LanguageModelV4GenerateResult } from "@ai-sdk/provider";

/**
 * Builds a minimal, correctly-shaped MockLanguageModelV4 `doGenerate`
 * result wrapping the given raw text — the shape `generateObject` expects
 * back from a provider before it applies extractJsonMiddleware/zod
 * validation. Shared across tests so the (fairly deep, easy-to-typo)
 * LanguageModelV4GenerateResult shape lives in exactly one place.
 */
export function mockGenerateResult(text: string): LanguageModelV4GenerateResult {
  return {
    content: [{ type: "text", text }],
    finishReason: { unified: "stop", raw: "stop" },
    usage: {
      inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 10, text: 10, reasoning: undefined },
    },
    warnings: [],
  };
}
