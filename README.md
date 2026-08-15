# JURY

**Before real people judge you, let 100 AI people do it first.**

Upload two competing images, pick a context, and a synthetic AI jury of 100
tells you which one wins — with reasons, audience-segment breakdowns, and an
improvement tip. No account required.

## How it works

- **Contexts** (`src/lib/jury/types.ts`) — Dating, Professional, Social,
  Status, Trust, Style — each changes what the jury weighs.
- **Personas** — 8 archetypes (bold, reserved, socially-driven, analytical,
  status-sensitive, trust-sensitive, aesthetic-focused, warmth-focused) with
  different priorities, simulated heterogeneously.
- **One model call** (`src/app/api/jury/route.ts`) — both images and a
  structured prompt go to a single `generateObject` call against the
  [Gemini Developer API](https://ai.google.dev/gemini-api/docs) (Google AI
  Studio's free-tier endpoint, called directly — no Vercel AI Gateway, no
  Vertex AI, no billing account), which reasons through all 8 personas and
  returns a strict, zod-validated JSON verdict (vote split, reasons,
  segments, confidence, improvement tip). No 100 separate model calls, no
  database.
- Default model is `gemini-2.5-flash-lite` — the Gemini model with the most
  generous free-tier quota that still supports image input. Override with
  `JURY_MODEL`.
- Images never touch disk — they're compressed client-side, sent as base64
  to the API route, and never stored.
- **Challenge Someone** — the winning image + context are encoded into a URL
  fragment (never sent to a server), so a challenger can load `/challenge#...`
  and face the defending image with zero backend state.

## Local development

```bash
npm install
npm run dev
```

Requires a `GOOGLE_GENERATIVE_AI_API_KEY` to actually get verdicts, both
locally and on Vercel:

1. Create a free key at [Google AI Studio](https://aistudio.google.com/apikey)
   — no credit card, no billing account.
2. Vercel dashboard → JURY project → **Settings** → **Environment Variables**
   → add `GOOGLE_GENERATIVE_AI_API_KEY` with that value (all environments) →
   **Save** → redeploy.
3. For local dev, put the same value in `.env.local`.

This calls Google's free Gemini API tier directly — no Vercel AI Gateway
account, no Anthropic/OpenAI key, no payment card of any kind.

Optional: override the model with `JURY_MODEL` (defaults to
`gemini-2.5-flash-lite`).

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS v4 + the Vercel AI SDK
(`ai` + `@ai-sdk/google`, calling the Gemini Developer API directly).
Mobile-first, dark, no required database for V1.
