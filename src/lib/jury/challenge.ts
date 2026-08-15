import { CONTEXTS, type JuryContext } from "./types";

export interface ChallengePayload {
  context: JuryContext;
  image: string;
  label: "A" | "B";
}

/**
 * No database in V1, so the challenge state (defender image + context) is
 * carried entirely in the URL fragment. Fragments never reach the server,
 * so the image data isn't logged anywhere.
 */
export function encodeChallenge(payload: ChallengePayload): string {
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64;
}

export function decodeChallenge(fragment: string): ChallengePayload | null {
  try {
    const json = decodeURIComponent(escape(atob(fragment)));
    const parsed = JSON.parse(json);
    if (
      parsed &&
      typeof parsed.image === "string" &&
      parsed.image.startsWith("data:image/") &&
      CONTEXTS.includes(parsed.context) &&
      (parsed.label === "A" || parsed.label === "B")
    ) {
      return parsed as ChallengePayload;
    }
    return null;
  } catch {
    return null;
  }
}
