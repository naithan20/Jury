import { NextRequest, NextResponse } from "next/server";
import { parseDataUrl } from "@/lib/jury/parseImage";
import { runJuryEvaluation } from "@/lib/jury/runEvaluation";
import { evaluationRequestSchema } from "@/lib/jury/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = evaluationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request. Two images and a valid context are required." },
      { status: 400 },
    );
  }

  const imageA = parseDataUrl(parsed.data.imageA);
  const imageB = parseDataUrl(parsed.data.imageB);
  if (!imageA || !imageB) {
    return NextResponse.json(
      { error: "Images must be valid, reasonably sized image files." },
      { status: 400 },
    );
  }

  const outcome = await runJuryEvaluation({ context: parsed.data.context, imageA, imageB }, "ui");

  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.message }, { status: 502 });
  }
  return NextResponse.json({ result: outcome.result });
}
