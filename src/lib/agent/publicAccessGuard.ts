import { SELECTED_MODEL_ID } from "@/lib/jury/model";

// The public, unauthenticated agent endpoint is only safe to expose while
// JURY is genuinely $0-per-call, regardless of volume. This allowlist is
// the deterministic guarantee of that: if the model configured in
// src/lib/jury/model.ts is ever changed to anything not on this list (a
// paid provider, a paid/BYOK OpenRouter route, a metered free tier with a
// spend cap, etc.), the public agent endpoint stops working automatically.
// Nobody has to remember to touch agent-specific code when changing the
// model — the check is structural, not a policy someone has to recall.
const KNOWN_ZERO_COST_MODELS = new Set(["openrouter/free"]);

export type PublicAccessResult = "ok" | "disabled";

/**
 * Manual emergency stop, independent of the model check above. Absent (the
 * default) means enabled — the public dogfood endpoint requires zero
 * configuration to work. Set to the literal string "false" to kill it
 * instantly without a redeploy of application logic.
 */
export function checkPublicAgentAccess(): PublicAccessResult {
  if (process.env.AGENT_PUBLIC_ACCESS_ENABLED === "false") return "disabled";
  if (!KNOWN_ZERO_COST_MODELS.has(SELECTED_MODEL_ID)) return "disabled";
  return "ok";
}
