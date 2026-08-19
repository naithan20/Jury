import { ipAddress } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";
import { checkPublicAgentAccess } from "@/lib/agent/publicAccessGuard";
import { AGENT_GLOBAL_QUOTA_KEY, agentGlobalLimiter, agentPerIpLimiter } from "@/lib/agent/rateLimit";
import { ideaEvaluationRequestSchema } from "@/lib/jury/ideaTypes";
import { runIdeaEvaluation, type IdeaEvaluationDiagnostics } from "@/lib/jury/runIdeaEvaluation";

export const runtime = "nodejs";
export const maxDuration = 60;

const CONTRACT_VERSION = "1.0";

// Free text only (no images) — subject/evaluationGoal are already bounded
// to 2000/300 characters by ideaEvaluationRequestSchema, so this just needs
// to comfortably cover that plus JSON/UTF-8 overhead, not the multi-MB
// range the image endpoint needs.
const MAX_BODY_BYTES = 32 * 1024;

type ErrorCode =
  | "PUBLIC_ACCESS_DISABLED"
  | "RATE_LIMITED"
  | "DAILY_QUOTA_EXCEEDED"
  | "PAYLOAD_TOO_LARGE"
  | "INVALID_JSON"
  | "INVALID_REQUEST"
  | "UPSTREAM_ERROR";

function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  extraHeaders?: HeadersInit,
  diagnostics?: IdeaEvaluationDiagnostics,
) {
  return NextResponse.json(
    {
      ok: false,
      version: CONTRACT_VERSION,
      error: { code, message },
      ...(diagnostics ? { diagnostics } : {}),
    },
    { status, headers: extraHeaders },
  );
}

/**
 * TEMPORARY: whether to echo runIdeaEvaluation's safe diagnostic metadata
 * (attempt timings, error classification — never secrets/prompts/content,
 * see runIdeaEvaluation.ts) back in an UPSTREAM_ERROR response. Off by
 * default for every normal caller (including AgentGraph) — this never
 * changes the documented public contract unless BOTH:
 *  1. the caller explicitly opts in via the X-Jury-Diagnostics header, AND
 *  2. AGENT_IDEA_DIAGNOSTICS_ENABLED hasn't been explicitly set to "false"
 *     (the kill switch for turning this off instantly without a redeploy
 *     once the live-invocation diagnosis this exists for is done).
 * Candidate for removal entirely once the current investigation concludes.
 */
function diagnosticsRequested(req: NextRequest): boolean {
  if (process.env.AGENT_IDEA_DIAGNOSTICS_ENABLED === "false") return false;
  return Boolean(req.headers.get("x-jury-diagnostics"));
}

/**
 * Same stream-with-running-byte-count approach as /api/agent/evaluate — see
 * that route for the full rationale. Duplicated here (rather than shared)
 * so the live image endpoint's code path is never touched by this addition.
 */
async function readBodyWithLimit(req: NextRequest, maxBytes: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

/**
 * Agent-facing free-text idea/decision evaluation — the multi-perspective,
 * disagreement-surfacing capability JURY's AgentGraph listing advertises but
 * the image-comparison endpoint (POST /api/agent/evaluate) can't actually
 * provide. Separate route, separate schema, separate evaluation engine
 * (runIdeaEvaluation.ts) — the image endpoint is unmodified by this addition.
 *
 * Shares its public-access kill switch, per-IP limiter, and global daily
 * quota with the image endpoint rather than getting independent ones: both
 * routes draw from the exact same shared OpenRouter free-tier ceiling (20
 * req/min, 50 req/day, project-wide), so a second independent 10/day quota
 * here would let combined agent traffic approach 40/day (with retries) —
 * uncomfortably close to crowding out the human UI's share. One shared
 * counter keeps total agent-attributable load bounded regardless of which
 * agent capability is being called.
 */
export async function POST(req: NextRequest) {
  const access = checkPublicAgentAccess();
  if (access === "disabled") {
    return errorResponse(
      503,
      "PUBLIC_ACCESS_DISABLED",
      "Public agent invocation is currently disabled on this deployment.",
    );
  }

  const ip = ipAddress(req) ?? "unknown";
  const perIp = agentPerIpLimiter.check(ip);
  if (!perIp.allowed) {
    return errorResponse(429, "RATE_LIMITED", "Per-caller rate limit exceeded. Try again later.", {
      "Retry-After": String(perIp.retryAfterSeconds),
    });
  }

  const global = agentGlobalLimiter.check(AGENT_GLOBAL_QUOTA_KEY);
  if (!global.allowed) {
    return errorResponse(
      429,
      "DAILY_QUOTA_EXCEEDED",
      "The public agent daily quota for this deployment has been reached. Try again later.",
      { "Retry-After": String(global.retryAfterSeconds) },
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }

  const bodyText = await readBodyWithLimit(req, MAX_BODY_BYTES);
  if (bodyText === null) {
    return errorResponse(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }

  let body: unknown;
  try {
    body = bodyText ? JSON.parse(bodyText) : undefined;
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = ideaEvaluationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      "INVALID_REQUEST",
      "Expected { subject: string (10-2000 chars), evaluationGoal?: string (<=300 chars) }.",
    );
  }

  const outcome = await runIdeaEvaluation(
    { subject: parsed.data.subject, evaluationGoal: parsed.data.evaluationGoal },
    "agent",
  );

  if (!outcome.ok) {
    return errorResponse(
      502,
      "UPSTREAM_ERROR",
      outcome.message,
      undefined,
      diagnosticsRequested(req) ? outcome.diagnostics : undefined,
    );
  }

  return NextResponse.json({ ok: true, version: CONTRACT_VERSION, result: outcome.result });
}
