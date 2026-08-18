import { ipAddress } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";
import { checkPublicAgentAccess } from "@/lib/agent/publicAccessGuard";
import { AGENT_GLOBAL_QUOTA_KEY, agentGlobalLimiter, agentPerIpLimiter } from "@/lib/agent/rateLimit";
import { parseDataUrl } from "@/lib/jury/parseImage";
import { runJuryEvaluation } from "@/lib/jury/runEvaluation";
import { evaluationRequestSchema } from "@/lib/jury/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const CONTRACT_VERSION = "1.0";

// Two 6MB images, base64-inflated (~4/3), plus JSON/prompt overhead.
const MAX_BODY_BYTES = 18 * 1024 * 1024;

type ErrorCode =
  | "PUBLIC_ACCESS_DISABLED"
  | "RATE_LIMITED"
  | "DAILY_QUOTA_EXCEEDED"
  | "PAYLOAD_TOO_LARGE"
  | "INVALID_JSON"
  | "INVALID_REQUEST"
  | "INVALID_IMAGE"
  | "UPSTREAM_ERROR";

function errorResponse(status: number, code: ErrorCode, message: string, extraHeaders?: HeadersInit) {
  return NextResponse.json(
    { ok: false, version: CONTRACT_VERSION, error: { code, message } },
    { status, headers: extraHeaders },
  );
}

/**
 * Reads the request body as text, aborting (returning null) once it
 * exceeds maxBytes — rather than trusting the Content-Length header, which
 * a caller can omit or misreport. Bounds worst-case memory use regardless
 * of what the client claims about the payload size.
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
 * Agent-facing evaluation endpoint. Same real evaluation engine as the
 * browser UI's /api/jury (see src/lib/jury/runEvaluation.ts) — deliberately
 * open, no credential. A bearer secret can't be part of a publicly
 * discoverable AgentGraph invocation contract (that's a contradiction: a
 * "public secret" isn't a secret), and this project doesn't yet have any
 * legitimate self-service way for an unfamiliar external agent to obtain
 * one, so requiring one would just mean the zero-human discovery chain
 * dead-ends at "auth required" with no way through.
 *
 * Abuse/cost is bounded a different way: a deterministic kill switch tied
 * to the configured model (see publicAccessGuard.ts) plus a per-IP and a
 * global rolling-24h quota (see rateLimit.ts). None of this is the actual
 * safety boundary against runaway cost — openrouter/free is $0 regardless
 * of call volume, and OpenRouter's own infrastructure hard-enforces a
 * project-wide 50 requests/day ceiling no matter what happens in this
 * route. These checks exist so the agent surface can't casually consume
 * that whole shared budget and crowd out the human UI, not to prevent a
 * bill that structurally can't happen today.
 *
 * No CORS headers: this is meant for server-to-server agent calls, not
 * browser JS on third-party pages, and CORS wouldn't restrict a
 * server-to-server caller anyway — only fetch() calls from a browser are
 * subject to it.
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

  const parsed = evaluationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      "INVALID_REQUEST",
      "Expected { context: one of dating|professional|social|status|trust|style, imageA: data URL, imageB: data URL }.",
    );
  }

  const imageA = parseDataUrl(parsed.data.imageA);
  const imageB = parseDataUrl(parsed.data.imageB);
  if (!imageA || !imageB) {
    return errorResponse(
      400,
      "INVALID_IMAGE",
      "imageA and imageB must be data:image/...;base64,... URLs no larger than 6MB each.",
    );
  }

  const outcome = await runJuryEvaluation(
    { context: parsed.data.context, imageA, imageB },
    "agent",
  );

  if (!outcome.ok) {
    return errorResponse(502, "UPSTREAM_ERROR", outcome.message);
  }

  return NextResponse.json({ ok: true, version: CONTRACT_VERSION, result: outcome.result });
}
