import { MAX_IMAGE_BYTES } from "./types";

export interface ParsedImage {
  mediaType: string;
  base64: string;
}

/**
 * Validates a `data:image/...;base64,...` string and enforces the size cap.
 * Shared by every entry point that accepts images — there is exactly one
 * place image input is trusted to be well-formed.
 */
export function parseDataUrl(dataUrl: string): ParsedImage | null {
  const match = /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, mediaType, base64] = match;
  const approxBytes = (base64.length * 3) / 4;
  if (approxBytes > MAX_IMAGE_BYTES) return null;
  return { mediaType, base64 };
}
