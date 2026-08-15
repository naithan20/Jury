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
  structured prompt go to a single `generateObject` call via the
  [Vercel AI Gateway](https://vercel.com/docs/ai-gateway), which reasons
  through all 8 personas and returns a strict, zod-validated JSON verdict
  (vote split, reasons, segments, confidence, improvement tip). No 100
  separate model calls, no database.
- Default model is `google/gemini-3.1-flash-lite` — the cheapest current
  vision-capable model on the Gateway, chosen to stretch Vercel's free
  monthly Gateway credit as far as possible while validating the product.
  Override with `JURY_MODEL`.
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

Requires an `AI_GATEWAY_API_KEY` to actually get verdicts, both locally and
on Vercel:

1. In the Vercel dashboard, open the project → **AI** → **API Keys** → **Create Key**.
2. Copy the key.
3. Project → **Settings** → **Environment Variables** → add `AI_GATEWAY_API_KEY`
   with that value (all environments) → **Save** → redeploy.
4. For local dev, put the same value in `.env.local`.

This uses Vercel's own provider relationship — you do **not** need your own
Anthropic/OpenAI/Google API key. Usage is billed against Vercel's free
$5/month AI Gateway credit; a single jury run costs a small fraction of a
cent on `google/gemini-3.1-flash-lite`.

Optional: override the model with `JURY_MODEL` (defaults to
`google/gemini-3.1-flash-lite`).

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS v4 + the Vercel AI SDK.
Mobile-first, dark, no required database for V1.
