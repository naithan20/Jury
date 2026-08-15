import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
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

// Direct Gemini Developer API (generativelanguage.googleapis.com) — the
// free-tier endpoint, not Vertex AI, and not routed through Vercel AI
// Gateway. Reads GOOGLE_GENERATIVE_AI_API_KEY automatically. Flash-Lite has
// the most generous free-tier quota of the vision-capable Gemini models.
// Override with JURY_MODEL if needed.
const MODEL = google(process.env.JURY_MODEL || "gemini-2.5-flash-lite");

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

  try {
    const { object } = await generateObject({
      model: MODEL,
      schema: juryResultSchema,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildUserPrompt(parsed.data.context) },
            { type: "text", text: "IMAGE A:" },
            { type: "file", data: imgA.base64, mediaType: imgA.mediaType },
            { type: "text", text: "IMAGE B:" },
            { type: "file", data: imgB.base64, mediaType: imgB.mediaType },
          ],
        },
      ],
      maxOutputTokens: 1500,
      temperature: 0.8,
    });

    const result = normalizeJuryResult(object);
    return NextResponse.json({ result });
  } catch (err) {
    logGenerationFailure(err);
    return NextResponse.json(
      {
        error:
          "The jury couldn't reach a verdict right now. Please try again in a moment — if this keeps happening, the deployment's AI setup needs attention.",
      },
      { status: 502 },
    );
  }
}
