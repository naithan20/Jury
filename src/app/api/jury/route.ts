import { extractJsonMiddleware, generateObject, wrapLanguageModel } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeJuryResult } from "@/lib/jury/normalize";
import { buildUserPrompt, SYSTEM_PROMPT } from "@/lib/jury/prompt";
import { CONTEXTS, juryResultSchema, MAX_IMAGE_BYTES } from "@/lib/jury/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  context: z.enum(CONTEXTS),
  imageA: z.string().startsWith("data:image/"),
  imageB: z.string().startsWith("data:image/"),
});

// OpenRouter's Free Models Router — picks a $0 model per request, filtered
// to whatever the request actually needs (here: image input + structured
// output), so it won't hand this call to a text-only free model. No Vercel
// AI Gateway, no Gemini/Vertex, no card on file anywhere in this path.
// Reads OPENROUTER_API_KEY automatically. Override with JURY_MODEL to pin a
// specific free model instead (e.g. "google/gemma-4-31b-it:free").
//
// Free models aren't guaranteed to honor response_format strictly, so
// extractJsonMiddleware strips markdown fences / surrounding prose from the
// raw completion before it's parsed against the schema below — a local
// text fixup, not an extra model call.
const MODEL = wrapLanguageModel({
  model: openrouter(process.env.JURY_MODEL || "openrouter/free"),
  middleware: extractJsonMiddleware(),
});

/**
 * Deliberately duck-typed rather than using instanceof/isInstance checks:
 * bundlers can end up with more than one loaded copy of the AI SDK's error
 * classes, which makes those checks unreliable. Property presence is not.
 */
function logGenerationFailure(err: unknown) {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    console.error("JURY generation failed:", {
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
  console.error("JURY generation failed [non-error thrown]:", err);
}

function parseDataUrl(dataUrl: string): { mediaType: string; base64: string } | null {
  const match = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, mediaType, base64] = match;
  const approxBytes = (base64.length * 3) / 4;
  if (approxBytes > MAX_IMAGE_BYTES) return null;
  return { mediaType, base64 };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request. Two images and a valid context are required." },
      { status: 400 },
    );
  }

  const imgA = parseDataUrl(parsed.data.imageA);
  const imgB = parseDataUrl(parsed.data.imageB);
  if (!imgA || !imgB) {
    return NextResponse.json(
      { error: "Images must be valid, reasonably sized image files." },
      { status: 400 },
    );
  }

  const messages = [
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: buildUserPrompt(parsed.data.context) },
        { type: "text" as const, text: "IMAGE A:" },
        { type: "file" as const, data: imgA.base64, mediaType: imgA.mediaType },
        { type: "text" as const, text: "IMAGE B:" },
        { type: "file" as const, data: imgB.base64, mediaType: imgB.mediaType },
      ],
    },
  ];

  // Free open models don't reliably honor response_format, so a first
  // attempt occasionally comes back as unparsable/invalid JSON. One bounded
  // retry (never more) with a blunter instruction covers that without
  // burning meaningfully into the free daily request quota. Auth/rate-limit
  // errors are not retried — there's nothing a retry would fix.
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

      const result = normalizeJuryResult(object);
      return NextResponse.json({ result });
    } catch (err) {
      logGenerationFailure(err);
      const isRetryableParseFailure =
        attempt === 0 &&
        err !== null &&
        typeof err === "object" &&
        (err as { name?: unknown }).name === "AI_NoObjectGeneratedError";
      if (!isRetryableParseFailure) {
        return NextResponse.json(
          {
            error:
              "The jury couldn't reach a verdict right now. Please try again in a moment — if this keeps happening, the deployment's AI setup needs attention.",
          },
          { status: 502 },
        );
      }
      // fall through to the retry attempt
    }
  }

  // Unreachable — the loop above always returns, but TypeScript can't see
  // that, so this satisfies the function's return type.
  return NextResponse.json(
    { error: "The jury couldn't reach a verdict right now. Please try again in a moment." },
    { status: 502 },
  );
}
