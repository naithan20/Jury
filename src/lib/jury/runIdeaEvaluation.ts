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

/**
 * TEMPORARY diagnostic instrumentation, added to classify a live production
 * failure that Vercel's own log retention (free plan, ~1h) is too short to
 * capture after the fact. Every field here is operational metadata only —
 * never a secret, prompt, model-generated string, or payload. Safe to keep,
 * but candidate for removal once the underlying upstream issue is
 * understood and fixed (see route.ts for how this is surfaced).
 */
export interface AttemptDiagnostic {
  attempt: number;
  remainingBudgetMsAtStart: number;
  elapsedMs: number;
  errorName?: string;
  isAINoObjectGeneratedError: boolean;
  isAPICallError: boolean;
  apiCallStatusCode?: number;
  abortTimedOut: boolean;
  finishReason?: string;
}

export interface IdeaEvaluationDiagnostics {
  totalElapsedMs: number;
  attempts: AttemptDiagnostic[];
  outerRetryTriggered: boolean;
  secondAttemptStarted: boolean;
  budgetExhaustedBeforeAttempt?: number;
}

export type IdeaEvaluationOutcome =
  | { ok: true; result: IdeaResult; diagnostics: IdeaEvaluationDiagnostics }
  | { ok: false; message: string; diagnostics: IdeaEvaluationDiagnostics };

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

/**
 * Duck-typed classification of a caught generateObject error into safe,
 * non-sensitive metadata only — never the error's message/responseBody
 * (may echo upstream text) and never NoObjectGeneratedError's `.text`
 * (the model's raw generated content). `finishReason` alone (e.g. "length")
 * is enough to distinguish truncation from an ordinary parse failure
 * without exposing what was actually generated.
 */
function classifyAttemptError(err: unknown, attempt: number, remainingBudgetMsAtStart: number, elapsedMs: number): AttemptDiagnostic {
  if (!err || typeof err !== "object") {
    return { attempt, remainingBudgetMsAtStart, elapsedMs, isAINoObjectGeneratedError: false, isAPICallError: false, abortTimedOut: false };
  }
  const e = err as Record<string, unknown>;
  const name = typeof e.name === "string" ? e.name : undefined;
  const cause = e.cause && typeof e.cause === "object" ? (e.cause as Record<string, unknown>) : undefined;
  const causeName = typeof cause?.name === "string" ? cause.name : undefined;

  const isAINoObjectGeneratedError = name === "AI_NoObjectGeneratedError";
  const isAPICallError = name === "APICallError";
  const apiCallStatusCode = isAPICallError && typeof e.statusCode === "number" ? e.statusCode : undefined;
  const finishReason =
    isAINoObjectGeneratedError && typeof e.finishReason === "string" ? e.finishReason : undefined;
  const abortTimedOut =
    name === "AbortError" || name === "TimeoutError" || causeName === "AbortError" || causeName === "TimeoutError";

  return {
    attempt,
    remainingBudgetMsAtStart,
    elapsedMs,
    errorName: name,
    isAINoObjectGeneratedError,
    isAPICallError,
    apiCallStatusCode,
    abortTimedOut,
    finishReason,
  };
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

  const requestStartMs = Date.now();
  const deadline = requestStartMs + budget.totalBudgetMs;
  const attempts: AttemptDiagnostic[] = [];
  let outerRetryTriggered = false;
  let secondAttemptStarted = false;
  let budgetExhaustedBeforeAttempt: number | undefined;

  type Outcome = { ok: true; result: IdeaResult } | { ok: false; message: string };
  const finish = (outcome: Outcome): IdeaEvaluationOutcome => ({
    ...outcome,
    diagnostics: {
      totalElapsedMs: Date.now() - requestStartMs,
      attempts,
      outerRetryTriggered,
      secondAttemptStarted,
      budgetExhaustedBeforeAttempt,
    },
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < budget.minAttemptBudgetMs) {
      budgetExhaustedBeforeAttempt = attempt + 1;
      logGenerationFailure(
        new Error(
          `Invocation budget exhausted before attempt ${attempt + 1} (${remainingMs}ms remaining, minimum ${budget.minAttemptBudgetMs}ms).`,
        ),
        source,
      );
      return finish({ ok: false, message: GENERIC_FAILURE_MESSAGE });
    }

    if (attempt === 1) secondAttemptStarted = true;
    const attemptStartMs = Date.now();

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

      attempts.push({
        attempt: attempt + 1,
        remainingBudgetMsAtStart: remainingMs,
        elapsedMs: Date.now() - attemptStartMs,
        isAINoObjectGeneratedError: false,
        isAPICallError: false,
        abortTimedOut: false,
      });
      return finish({ ok: true, result: normalizeIdeaResult(object) });
    } catch (err) {
      logGenerationFailure(err, source);
      const diagnostic = classifyAttemptError(err, attempt + 1, remainingMs, Date.now() - attemptStartMs);
      attempts.push(diagnostic);

      const isRetryableParseFailure = attempt === 0 && diagnostic.isAINoObjectGeneratedError;
      if (!isRetryableParseFailure) {
        return finish({ ok: false, message: GENERIC_FAILURE_MESSAGE });
      }
      outerRetryTriggered = true;
    }
  }

  return finish({ ok: false, message: GENERIC_FAILURE_MESSAGE });
}
