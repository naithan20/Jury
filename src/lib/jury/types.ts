import { z } from "zod";

export const CONTEXTS = [
  "dating",
  "professional",
  "social",
  "status",
  "trust",
  "style",
] as const;

export type JuryContext = (typeof CONTEXTS)[number];

export const CONTEXT_META: Record<
  JuryContext,
  { label: string; question: string; weighting: string }
> = {
  dating: {
    label: "Dating",
    question: "Which photo gets more right-swipes?",
    weighting:
      "Warmth, approachability, perceived confidence, and romantic/sexual appeal matter most. Presentation polish matters less than genuine appeal.",
  },
  professional: {
    label: "Professional",
    question: "Which photo looks more hireable / promotable?",
    weighting:
      "Competence, trustworthiness, polish, and presentation quality matter most. Novelty and raw attractiveness matter far less.",
  },
  social: {
    label: "Social",
    question: "Which photo gets more likes on a social feed?",
    weighting:
      "Likeability, fun factor, relatability, and shareability matter most. Aesthetic novelty and warmth carry real weight here.",
  },
  status: {
    label: "Status",
    question: "Which photo signals higher status?",
    weighting:
      "Perceived success, taste, exclusivity, and confidence matter most. Warmth matters less; polish and aesthetic signaling matter more.",
  },
  trust: {
    label: "Trust",
    question: "Which photo feels more trustworthy?",
    weighting:
      "Sincerity, openness, reliability cues, and calm confidence matter most. Novelty and boldness can actively hurt here.",
  },
  style: {
    label: "Style",
    question: "Which photo has stronger personal style?",
    weighting:
      "Aesthetic coherence, taste, originality, and visual impact matter most. Trust and warmth carry little weight here.",
  },
};

export const PERSONAS = [
  {
    id: "bold",
    label: "Bold / Novelty-Seeking",
    lens: "Rewards boldness, novelty, and risk-taking. Bored by anything safe or generic.",
  },
  {
    id: "reserved",
    label: "Reserved / Conservative",
    lens: "Prefers understated, safe, classic choices. Suspicious of anything flashy or try-hard.",
  },
  {
    id: "social",
    label: "Socially Driven",
    lens: "Judges based on group appeal — would this get a reaction, a comment, a laugh among friends.",
  },
  {
    id: "analytical",
    label: "Analytical",
    lens: "Coldly weighs composition, technical quality, and consistency over gut feeling.",
  },
  {
    id: "status",
    label: "Status-Sensitive",
    lens: "Reads for signals of success, taste, and social rank above all else.",
  },
  {
    id: "trust",
    label: "Trust-Sensitive",
    lens: "Prioritizes sincerity and reliability cues; penalizes anything that feels staged or guarded.",
  },
  {
    id: "aesthetic",
    label: "Aesthetic-Focused",
    lens: "Purely visual — lighting, color, framing, styling. Indifferent to personality cues.",
  },
  {
    id: "warmth",
    label: "Warmth-Focused",
    lens: "Responds to friendliness, openness, and approachability above polish or status.",
  },
] as const;

export type PersonaId = (typeof PERSONAS)[number]["id"];

// Shared by every entry point that accepts an evaluation request (the
// browser UI's /api/jury and the agent-facing /api/agent/evaluate) — one
// validation contract, not two that could quietly drift apart.
export const evaluationRequestSchema = z.object({
  context: z.enum(CONTEXTS),
  imageA: z.string().startsWith("data:image/"),
  imageB: z.string().startsWith("data:image/"),
});

export const juryResultSchema = z.object({
  votesA: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Number of the 100 synthetic jurors who preferred image A"),
  votesB: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Number of the 100 synthetic jurors who preferred image B"),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe(
      "How confident the simulated jury's split is, based on the margin and how clear-cut the images were",
    ),
  confidenceNote: z
    .string()
    .max(160)
    .describe("One short clause explaining the confidence level"),
  winReason: z
    .string()
    .max(220)
    .describe("Strongest single reason the winning image won"),
  loseReason: z
    .string()
    .max(220)
    .describe("Strongest single reason the losing image lost"),
  loserStrength: z
    .string()
    .max(220)
    .describe("One concrete thing the losing image does better than the winner"),
  segments: z
    .array(
      z.object({
        persona: z
          .enum(PERSONAS.map((p) => p.id) as [PersonaId, ...PersonaId[]])
          .describe("Which persona archetype this segment represents"),
        favors: z.enum(["A", "B"]).describe("Which image this persona group leans toward"),
        note: z.string().max(140).describe("Brief reason this segment leans that way"),
      }),
    )
    .length(8)
    .describe("One entry per persona archetype, in the same order they were given"),
  improvementTip: z
    .string()
    .max(240)
    .describe(
      "Concrete, non-medical, non-cosmetic-surgery suggestion for how the losing image's subject could improve their odds next time (framing, lighting, styling, expression, background, etc.)",
    ),
});

export type JuryResultRaw = z.infer<typeof juryResultSchema>;

export interface JuryResult extends JuryResultRaw {
  winner: "A" | "B";
}

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
