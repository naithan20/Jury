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
- **One evaluation engine, two entry points** (`src/lib/jury/runEvaluation.ts`)
  — the browser UI's `POST /api/jury` and the agent-facing
  `POST /api/agent/evaluate` (see below) both call the exact same
  evaluation function. Both images and a structured prompt go to a single
  `generateObject` call against
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

The model ID (`openrouter/free`) is hardcoded in `src/lib/jury/model.ts`,
not read from an environment variable — `OPENROUTER_API_KEY` is used only
for authentication. This is deliberate: it rules out a misconfigured env
var ever being passed as a model ID.

## Agent API

`POST /api/agent/evaluate` exposes the same real evaluation engine as the
human UI to machine callers (e.g. via AgentGraph) — **deliberately with no
credential**. A bearer secret can't be part of a publicly-discoverable
invocation contract (a "public secret" isn't a secret), and this project
has no self-service way yet for an unfamiliar external agent to obtain one,
so requiring one would just dead-end the discovery → invocation chain at
"auth required."

Abuse/cost is bounded differently instead:
- A deterministic kill switch (`src/lib/agent/publicAccessGuard.ts`): the
  route refuses every request with 503 unless the configured model is on a
  hardcoded known-$0 allowlist. If JURY is ever pointed at a paid model,
  this endpoint stops working automatically — nobody has to remember to
  touch agent-specific code when changing the model.
- An emergency-stop env var, `AGENT_PUBLIC_ACCESS_ENABLED=false` (see
  `.env.example`) — optional, defaults to enabled.
- A per-IP rate limit (3 requests/10 min) and an independent global daily
  quota (10 requests/24h), both in-memory (`src/lib/agent/rateLimit.ts`).

None of this is the actual boundary against runaway cost: `openrouter/free`
is $0 regardless of call volume, and OpenRouter's own infrastructure
hard-enforces a 50-requests/day project-wide ceiling no matter what happens
in this route. These checks exist so the public agent surface can't
casually consume that whole shared budget and crowd out the human UI —
worst case, 10 invocations/day × up to 2 model calls each (one retry) = 20
calls/day from this endpoint, comfortably inside the 50/day shared limit.

The in-memory limiters are honestly **best-effort, not a distributed
guarantee** — each warm Vercel serverless instance holds its own counters,
so a burst hitting multiple cold-started instances simultaneously could
momentarily exceed the stated limits. For this first dogfood phase that's
an acceptable gap given the $0 backstop above; a true distributed limit
would need a shared store (Upstash Redis / Vercel KV) — worth adding if
agent traffic grows enough for the gap to matter.

See `src/app/api/agent/evaluate/route.ts` for the exact request/response
contract and `route.test.ts` alongside it for the full test coverage
(kill switch, both rate limits, malformed/malicious input,
secret-leakage checks).

## Testing

```bash
npm test
```

Runs the vitest suite (`src/**/*.test.ts`): route-level tests for both
`/api/jury` and `/api/agent/evaluate` (kill switch, per-IP + global rate
limiting, malformed and malicious input, secret-leakage checks), the
shared evaluation engine's retry-bound behavior, and the rate
limiter/access-guard helpers — all against a mocked language model
(`ai/test`'s `MockLanguageModelV4`), so tests never make real network
calls or consume the OpenRouter quota.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS v4 + the Vercel AI SDK
(`ai` + `@openrouter/ai-sdk-provider`, calling OpenRouter's API directly).
Mobile-first, dark, no required database for V1.
