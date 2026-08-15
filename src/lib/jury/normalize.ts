import { PERSONAS, type JuryResult, type JuryResultRaw } from "./types";

/**
 * Model output is validated by zod against the schema, but numeric/ordering
 * invariants (votes summing to 100, one segment per persona, in order) are
 * cheap to enforce here rather than rejecting an otherwise-good response.
 */
export function normalizeJuryResult(raw: JuryResultRaw): JuryResult {
  let { votesA, votesB } = raw;
  const total = votesA + votesB;

  if (total <= 0) {
    votesA = 50;
    votesB = 50;
  } else if (total !== 100) {
    const scaled = Math.round((votesA / total) * 100);
    votesA = Math.min(100, Math.max(0, scaled));
    votesB = 100 - votesA;
  }

  const winner: "A" | "B" = votesB > votesA ? "B" : "A";

  const segmentByPersona = new Map(raw.segments.map((s) => [s.persona, s]));
  const segments = PERSONAS.map((p) => {
    const found = segmentByPersona.get(p.id);
    return (
      found ?? {
        persona: p.id,
        favors: winner,
        note: "No strong lean expressed for this segment.",
      }
    );
  });

  return {
    ...raw,
    votesA,
    votesB,
    winner,
    segments,
  };
}
