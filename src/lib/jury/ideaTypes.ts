import { z } from "zod";
import { PERSONAS, type PersonaId } from "./types";

// Separate contract from evaluationRequestSchema/juryResultSchema (image
// comparison) — free text is a genuinely different threat/shape than two
// images, so this gets its own schema rather than overloading the existing
// one with optional/nullable image-or-text fields.
export const MAX_SUBJECT_CHARS = 2000;
export const MAX_GOAL_CHARS = 300;
export const MIN_SUBJECT_CHARS = 10;

export const ideaEvaluationRequestSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(MIN_SUBJECT_CHARS, `subject must be at least ${MIN_SUBJECT_CHARS} characters`)
    .max(MAX_SUBJECT_CHARS, `subject must be at most ${MAX_SUBJECT_CHARS} characters`),
  evaluationGoal: z
    .string()
    .trim()
    .max(MAX_GOAL_CHARS, `evaluationGoal must be at most ${MAX_GOAL_CHARS} characters`)
    .optional(),
});

export type IdeaEvaluationRequest = z.infer<typeof ideaEvaluationRequestSchema>;

const PERSONA_ID_ENUM = PERSONAS.map((p) => p.id) as [PersonaId, ...PersonaId[]];

// Bounded array lengths throughout: this is what actually caps output
// tokens (and therefore latency/cost) regardless of how verbose the model
// tries to be — not just a data-quality nicety.
const shortPoint = () => z.string().min(1).max(220);

export const ideaResultSchema = z.object({
  verdict: z
    .string()
    .max(320)
    .describe("One-paragraph synthesis of the panel's overall take, in plain language"),
  recommendation: z
    .enum(["pursue", "pursue_with_changes", "do_not_pursue", "insufficient_information"])
    .describe("The panel's aggregate recommendation"),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe("How confident the simulated panel's recommendation is, given the information provided"),
  confidenceNote: z.string().max(200).describe("One short clause explaining the confidence level"),
  panel: z
    .array(
      z.object({
        persona: z.enum(PERSONA_ID_ENUM).describe("Which persona archetype this entry represents"),
        stance: z
          .enum(["supportive", "skeptical", "mixed"])
          .describe("This persona's overall stance toward the idea"),
        note: z.string().max(200).describe("This persona's key point, in their own lens"),
      }),
    )
    .length(8)
    .describe("One entry per persona archetype, in the same order they were given"),
  argumentsFor: z
    .array(shortPoint())
    .min(1)
    .max(5)
    .describe("Strongest concrete arguments in favor, distinct from each other"),
  argumentsAgainst: z
    .array(shortPoint())
    .min(1)
    .max(5)
    .describe("Strongest concrete arguments against, distinct from each other"),
  disagreements: z
    .array(shortPoint())
    .min(1)
    .max(4)
    .describe("Where the personas genuinely diverge and why, not just restating for/against"),
  overlookedRisks: z
    .array(shortPoint())
    .min(1)
    .max(4)
    .describe("Risks or downsides a naive read of the idea would likely miss"),
  overlookedOpportunities: z
    .array(shortPoint())
    .min(1)
    .max(4)
    .describe("Upsides or adjacent opportunities a naive read of the idea would likely miss"),
  nextSteps: z
    .array(shortPoint())
    .min(1)
    .max(5)
    .describe("Concrete, practical next actions to de-risk or validate the idea"),
  keyUnknowns: z
    .array(shortPoint())
    .min(1)
    .max(5)
    .describe("Specific open questions whose answers would most change the recommendation"),
});

export type IdeaResultRaw = z.infer<typeof ideaResultSchema>;

export interface IdeaResult extends IdeaResultRaw {
  disclaimer: string;
}

export const IDEA_DISCLAIMER =
  "This is a synthetic, subjective simulation of how a panel of perspectives might react — not a factual, financial, legal, or scientific assessment. Treat it as one input among many.";
