import { NextRequest, NextResponse } from "next/server";
import { checkAgentAuth, getAgentKeyId } from "@/lib/agent/auth";
import { agentRateLimiter } from "@/lib/agent/rateLimit";
import { parseDataUrl } from "@/lib/jury/parseImage";
import { runJuryEvaluation } from "@/lib/jury/runEvaluation";
import { evaluationRequestSchema } from "@/lib/jury/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const CONTRACT_VERSION = "1.0";

// Two 6MB images, base64-inflated (~4/3), plus JSON/prompt overhead.
const MAX_BODY_BYTES = 18 * 1024 * 1024;

type ErrorCode =
  | "NOT_CONFIGURED"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
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
 * browser UI's /api/jury (see src/lib/jury/runEvaluation.ts) — this route
 * only adds the access control an unauthenticated, publicly-discoverable
 * endpoint needs: a shared-secret bearer token (fails closed if unset) and
 * a per-key rate limit, so autonomous callers can't consume the shared
 * OpenRouter free-tier quota the human product also depends on.
 *
 * No CORS headers: this is meant for server-to-server agent calls, not
 * browser JS on third-party pages, and CORS wouldn't restrict a
 * server-to-server caller anyway — only fetch() calls from a browser are
 * subject to it.
 */
export async function POST(req: NextRequest) {
  const auth = checkAgentAuth(req);
  if (auth === "not_configured") {
    return errorResponse(
      503,
      "NOT_CONFIGURED",
      "The agent API is not enabled on this deployment (AGENT_API_KEY is not set).",
    );
  }
  if (auth === "unauthorized") {
    return errorResponse(401, "UNAUTHORIZED", "Missing or invalid API key.");
  }

  const keyId = getAgentKeyId(req);
  // checkAgentAuth already confirmed a valid bearer token is present, so
  // keyId is guaranteed non-null here — this satisfies TypeScript's
  // narrowing without changing behavior.
  const rateLimit = agentRateLimiter.check(keyId ?? "unknown");
  if (!rateLimit.allowed) {
    return errorResponse(
      429,
      "RATE_LIMITED",
      "Rate limit exceeded. Try again later.",
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
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
