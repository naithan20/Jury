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
  structured prompt go to a single `generateObject` call against
  [OpenRouter's Free Models Router](https://openrouter.ai/openrouter/free)
  (`openrouter/free`), which auto-selects a $0 model per request filtered to
  whatever the request needs (here: image input + structured output). No
  Vercel AI Gateway, no Gemini/Vertex, no Anthropic/OpenAI key, no card on
  file anywhere in this path. The model reasons through all 8 personas and
  returns a strict, zod-validated JSON verdict (vote split, reasons,
  segments, confidence, improvement tip). No 100 separate model calls, no
  database.
- Free open models don't reliably honor structured-output formatting, so
  `extractJsonMiddleware` strips markdown fences/prose from the raw
  completion before it's parsed, and a single bounded retry (never more)
  fires only on a genuine parse/validation failure — not on auth or
  rate-limit errors, where a retry can't help.
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

Requires an `OPENROUTER_API_KEY` to actually get verdicts, both locally and
on Vercel:

1. Create a free account and API key at
   [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) — no
   credit card required to use free (`:free`) models.
2. Vercel dashboard → JURY project → **Settings** → **Environment Variables**
   → add `OPENROUTER_API_KEY` with that value (all environments) →
   **Save** → redeploy.
3. For local dev, put the same value in `.env.local`.

Free-tier limits (per OpenRouter, subject to change): 20 requests/minute,
50 requests/day without ever purchasing credits (1,000/day if you later
choose to add credits — never required to start).

Optional: override the model with `JURY_MODEL` to pin a specific free model
instead of the auto-router (e.g. `google/gemma-4-31b-it:free`).

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS v4 + the Vercel AI SDK
(`ai` + `@openrouter/ai-sdk-provider`, calling OpenRouter's API directly).
Mobile-first, dark, no required database for V1.
