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

Requires an AI Gateway credential to actually get verdicts:

- Deployed on Vercel: nothing to do — Vercel injects AI Gateway credentials
  automatically.
- Local dev / elsewhere: set `AI_GATEWAY_API_KEY` in `.env.local` (get one
  from https://vercel.com/docs/ai-gateway).

Optional: override the model with `JURY_MODEL` (defaults to
`anthropic/claude-haiku-4.5`).

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS v4 + the Vercel AI SDK.
Mobile-first, dark, no required database for V1.
