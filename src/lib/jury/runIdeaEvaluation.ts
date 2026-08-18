import { generateObject } from "ai";
import { MODEL, SELECTED_MODEL_ID } from "./model";
import { normalizeIdeaResult } from "./normalizeIdea";
import { buildIdeaUserPrompt, IDEA_SYSTEM_PROMPT } from "./ideaPrompt";
import { ideaResultSchema, type IdeaResult } from "./ideaTypes";

export interface IdeaEvaluationInput {
  subject: string;
  evaluationGoal?: string;
}

export interface IdeaEvaluationBudget {
  totalBudgetMs: number;
  minAttemptBudgetMs: number;
}

// Same reasoning as runEvaluation.ts's DEFAULT_BUDGET: both agent routes
// declare maxDuration = 60 (the platform's hard ceiling), so this budget
// leaves a wide margin to always return its own structured response first.
const DEFAULT_BUDGET: IdeaEvaluationBudget = {
  totalBudgetMs: 40_000,
  minAttemptBudgetMs: 8_000,
};

export type IdeaEvaluationOutcome =
  | { ok: true; result: IdeaResult }
  | { ok: false; message: string };

function logGenerationFailure(err: unknown, source: string) {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    console.error(`JURY idea-generation failed [${source}]:`, {
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
  console.error(`JURY idea-generation failed [${source}] [non-error thrown]:`, err);
}

const GENERIC_FAILURE_MESSAGE =
  "The panel couldn't reach a verdict right now. Please try again in a moment — if this keeps happening, the deployment's AI setup needs attention.";

/**
 * The free-text sibling of runEvaluation.ts's runJuryEvaluation — same
 * overall wall-clock budget, single-retry-on-genuine-parse-failure, and
 * maxRetries:0 pattern, deliberately duplicated here rather than sharing an
 * abstraction with the image evaluation engine. The image endpoint is live
 * in production; this keeps that code path completely untouched while this
 * new capability is added, at the cost of a small amount of duplication.
 */
export async function runIdeaEvaluation(
  input: IdeaEvaluationInput,
  source: "agent",
  budget: IdeaEvaluationBudget = DEFAULT_BUDGET,
): Promise<IdeaEvaluationOutcome> {
  const messages = [
    {
      role: "user" as const,
      content: buildIdeaUserPrompt(input.subject, input.evaluationGoal),
    },
  ];

  console.log("JURY idea request:", {
    source,
    selectedModel: SELECTED_MODEL_ID,
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
    nodeEnv: process.env.NODE_ENV,
    totalBudgetMs: budget.totalBudgetMs,
    subjectLength: input.subject.length,
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
        schema: ideaResultSchema,
        system:
          attempt === 0
            ? IDEA_SYSTEM_PROMPT
            : `${IDEA_SYSTEM_PROMPT}\n\nCRITICAL: Reply with ONLY the JSON object matching the schema. No markdown, no code fences, no commentary before or after it.`,
        messages,
        maxOutputTokens: 1800,
        temperature: attempt === 0 ? 0.8 : 0.4,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(remainingMs),
      });

      return { ok: true, result: normalizeIdeaResult(object) };
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
    }
  }

  return { ok: false, message: GENERIC_FAILURE_MESSAGE };
}
