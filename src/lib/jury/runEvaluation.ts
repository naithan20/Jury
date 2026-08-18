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
 * never on auth/rate-limit errors, where a retry can't help and would just
 * burn into the free daily request quota.
 */
export async function runJuryEvaluation(
  input: EvaluationInput,
  source: "ui" | "agent",
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
  });

  for (let attempt = 0; attempt < 2; attempt++) {
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
      // fall through to the retry attempt
    }
  }

  // Unreachable — the loop above always returns, but TypeScript can't see
  // that, so this satisfies the function's return type.
  return { ok: false, message: GENERIC_FAILURE_MESSAGE };
}
