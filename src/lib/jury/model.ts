import { extractJsonMiddleware, wrapLanguageModel } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Two deliberately separate things: OPENROUTER_API_KEY is ONLY ever read
// here, for authentication. The model ID is a hardcoded literal below — not
// sourced from any environment variable — so a misconfigured env var (e.g.
// one accidentally holding the text "OPENROUTER_API_KEY") can never end up
// in the model slot. Reliability over configurability for this MVP.
const SELECTED_MODEL = "openrouter/free";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// OpenRouter's Free Models Router — picks a $0 model per request, filtered
// to whatever the request actually needs (here: image input + structured
// output), so it won't hand this call to a text-only free model. No Vercel
// AI Gateway, no Gemini/Vertex, no card on file anywhere in this path.
//
// Free models aren't guaranteed to honor response_format strictly, so
// extractJsonMiddleware strips markdown fences / surrounding prose from the
// raw completion before it's parsed against the schema below — a local
// text fixup, not an extra model call.
//
// This is the single model instance shared by every JURY entry point
// (the browser-facing /api/jury route and the agent-facing
// /api/agent/evaluate route) — there is exactly one evaluation engine.
export const MODEL = wrapLanguageModel({
  model: openrouter(SELECTED_MODEL),
  middleware: extractJsonMiddleware(),
});

export const SELECTED_MODEL_ID = SELECTED_MODEL;
