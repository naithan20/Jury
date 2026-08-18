import { PERSONAS } from "./types";
import { IDEA_DISCLAIMER, type IdeaResult, type IdeaResultRaw } from "./ideaTypes";

/**
 * Mirrors normalize.ts's philosophy: zod already validated shape/enums, this
 * just backfills a missing persona panel entry (defensive — the schema
 * requires length 8, but a model could still return them out of order or a
 * bundler-level edge case could reorder) and attaches the disclaimer, which
 * is intentionally NOT part of the model-generated schema — it's a fixed
 * server-side string so it can never be reworded or dropped by the model.
 */
export function normalizeIdeaResult(raw: IdeaResultRaw): IdeaResult {
  const entryByPersona = new Map(raw.panel.map((entry) => [entry.persona, entry]));
  const panel = PERSONAS.map((p) => {
    const found = entryByPersona.get(p.id);
    return (
      found ?? {
        persona: p.id,
        stance: "mixed" as const,
        note: "No strong lean expressed for this perspective.",
      }
    );
  });

  return {
    ...raw,
    panel,
    disclaimer: IDEA_DISCLAIMER,
  };
}
