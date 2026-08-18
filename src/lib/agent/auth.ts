import { createHash, timingSafeEqual } from "node:crypto";

export type AgentAuthResult = "ok" | "not_configured" | "unauthorized";

function hash(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Constant-time bearer-token check against AGENT_API_KEY. Hashing both
 * sides to a fixed-length digest before comparing avoids the length-based
 * short-circuit that a naive `===` (or even a length-mismatched
 * timingSafeEqual, which throws) would leak.
 *
 * Fails closed: if AGENT_API_KEY isn't set at all, every request is
 * rejected — a forgotten env var can never fall back to "no auth required".
 */
export function checkAgentAuth(req: Request): AgentAuthResult {
  const expected = process.env.AGENT_API_KEY;
  if (!expected) return "not_configured";

  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return "unauthorized";

  const provided = match[1].trim();
  if (!provided) return "unauthorized";

  const isEqual = timingSafeEqual(hash(provided), hash(expected));
  return isEqual ? "ok" : "unauthorized";
}

/**
 * A stable, non-reversible identifier for the caller's bearer token, for
 * rate-limit keying only — never the raw token, so it never ends up
 * sitting in the rate limiter's in-memory map or in any future debug dump.
 */
export function getAgentKeyId(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const token = match?.[1]?.trim();
  if (!token) return null;
  return hash(token).toString("hex");
}
