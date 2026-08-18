import { generateObject } from "ai";
import { MODEL, SELECTED_MODEL_ID } from "./model";
import { normalizeJuryResult } from "./normalize";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import { juryResultSchema, type JuryContext, type JuryResult } from "./types";
import type { ParsedImage } from "./parseImage";

export interface EvaluationInput {
  context: JuryContext;
  imageA: ParsedImage;
  imageB: ParsedImage;
}

export interface EvaluationBudget {
  /**
   * Total wall-clock time allowed across every attempt combined, in ms.
   * Deliberately an OVERALL budget rather than an independent per-attempt
   * timeout: attempt 2 only ever gets what's left of this, not a fresh
   * allowance of its own.
   */
  totalBudgetMs: number;
  /**
   * If less than this much budget remains before starting an attempt,
   * don't start it — a doomed attempt that gets aborted almost immediately
   * wastes an upstream call for nothing.
   */
  minAttemptBudgetMs: number;
}

// Both Next.js routes that call this (api/jury, api/agent/evaluate) declare
// maxDuration = 60 — the hard platform ceiling Vercel will force-kill the
// function at, returning a bare 504 with none of our own error handling.
// 40s leaves a substantial (~20s / 33%) margin for cold start, image/JSON
// parsing, network overhead between us and Vercel's edge, and response
// serialization — so this function always returns its OWN structured
// success/error response well before the platform could ever intervene.
const DEFAULT_BUDGET: EvaluationBudget = {
  totalBudgetMs: 40_000,
  minAttemptBudgetMs: 8_000,
};

export type EvaluationOutcome =
  | { ok: true; result: JuryResult }
  | { ok: false; message: string };

/**
 * Deliberately duck-typed rather than using instanceof/isInstance checks:
 * bundlers can end up with more than one loaded copy of the AI SDK's error
 * classes, which makes those checks unreliable. Property presence is not.
 */
function logGenerationFailure(err: unknown, source: string) {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    console.error(`JURY generation failed [${source}]:`, {
      name: e.name ?? err.constructor?.name,
      message: e.message,
      statusCode: e.statusCode,
      type: e.type,
      isRetryable: e.isRetryable,
      url: e.url,
      responseBody:
        typeof e.responseBody === "string" ? e.responseBody.slice(0, 2000) : undefined,
      cause: e.cause instanceof Error ? { name: e.cause.name, message: e.cause.message } : e.cause,
    });
    return;
  }
  console.error(`JURY generation failed [${source}] [non-error thrown]:`, err);
}

const GENERIC_FAILURE_MESSAGE =
  "The jury couldn't reach a verdict right now. Please try again in a moment — if this keeps happening, the deployment's AI setup needs attention.";

/**
 * The single real evaluation engine behind every JURY entry point (browser
 * UI via /api/jury, and autonomous agents via /api/agent/evaluate). Runs
 * one structured-output model call reasoning through all 8 personas, with
 * one bounded retry (never more) on a genuine parse/validation failure —
 * never on auth/rate-limit/timeout errors, where a retry can't help.
 *
 * Bounded by an overall wall-clock budget (see EvaluationBudget above), not
 * independent per-attempt timeouts: this always returns its own structured
 * outcome before the hosting platform's own execution-time ceiling could
 * terminate the request out from under it. Each attempt also disables the
 * AI SDK's own default internal retry-with-backoff (maxRetries: 2,
 * 2s/4s delays) via maxRetries: 0 — that behavior is invisible to and
 * uncontrolled by this function's own budget, so leaving it on undermines
 * the whole point of tracking a budget in the first place.
 */
export async function runJuryEvaluation(
  input: EvaluationInput,
  source: "ui" | "agent",
  budget: EvaluationBudget = DEFAULT_BUDGET,
): Promise<EvaluationOutcome> {
  const messages = [
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: buildUserPrompt(input.context) },
        { type: "text" as const, text: "IMAGE A:" },
        { type: "file" as const, data: input.imageA.base64, mediaType: input.imageA.mediaType },
        { type: "text" as const, text: "IMAGE B:" },
        { type: "file" as const, data: input.imageB.base64, mediaType: input.imageB.mediaType },
      ],
    },
  ];

  console.log("JURY request:", {
    source,
    selectedModel: SELECTED_MODEL_ID,
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
    nodeEnv: process.env.NODE_ENV,
    totalBudgetMs: budget.totalBudgetMs,
  });

  const deadline = Date.now() + budget.totalBudgetMs;

  for (let attempt = 0; attempt < 2; attempt++) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < budget.minAttemptBudgetMs) {
      logGenerationFailure(
        new Error(
          `Invocation budget exhausted before attempt ${attempt + 1} (${remainingMs}ms remaining, minimum ${budget.minAttemptBudgetMs}ms).`,
        ),
        source,
      );
      return { ok: false, message: GENERIC_FAILURE_MESSAGE };
    }

    try {
      const { object } = await generateObject({
        model: MODEL,
        schema: juryResultSchema,
        system:
          attempt === 0
            ? SYSTEM_PROMPT
            : `${SYSTEM_PROMPT}\n\nCRITICAL: Reply with ONLY the JSON object matching the schema. No markdown, no code fences, no commentary before or after it.`,
        messages,
        maxOutputTokens: 1500,
        temperature: attempt === 0 ? 0.8 : 0.4,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(remainingMs),
      });

      return { ok: true, result: normalizeJuryResult(object) };
    } catch (err) {
      logGenerationFailure(err, source);
      const isRetryableParseFailure =
        attempt === 0 &&
        err !== null &&
        typeof err === "object" &&
        (err as { name?: unknown }).name === "AI_NoObjectGeneratedError";
      if (!isRetryableParseFailure) {
        return { ok: false, message: GENERIC_FAILURE_MESSAGE };
      }
      // fall through to the retry attempt — the loop's own budget check
      // above ensures this only proceeds if enough time genuinely remains
    }
  }

  // Unreachable — the loop above always returns, but TypeScript can't see
  // that, so this satisfies the function's return type.
  return { ok: false, message: GENERIC_FAILURE_MESSAGE };
}
