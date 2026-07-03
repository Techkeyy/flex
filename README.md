# Flex — the audit swarm

**One Solidity contract → three independent AI auditors → one reconciled verdict.**
Built for the **BTL Runtime Hackathon 2026**. Every call goes through the BTL
runtime — the one rule of the event.

A single model audits a contract and quietly misses things. Flex sends the same
contract to three models from three providers *at once*, then reconciles them:

- **Confirmed** — all three flagged it → high confidence.
- **Contested** — two of three → probably real.
- **Lone flag** — one of three → a subtle catch or a false positive; a human looks.

Disagreement is the signal. Flex doesn't claim your contract is safe — it tells
you how much to trust the review, and shows exactly where to look.

## Why BTL

Three providers would normally mean three keys, three SDKs, three bills. BTL
collapses that to one OpenAI-compatible endpoint and one key. And every response
carries proof-of-savings headers (`x-btl-saved`, `x-btl-customer-charge`,
`x-btl-benchmark-cost`) — Flex surfaces them as a cost receipt on every audit,
answering the "isn't a swarm expensive?" objection head-on.

## Stack

- Next.js (App Router) + TypeScript — one app, backend in API routes
- OpenAI SDK pointed at `https://api.badtheorylabs.com/v1`
- Hand-crafted CSS design system (no UI framework)
- **Mock mode** so the whole app works with no key (for building + offline demos)

## Run

```bash
npm install
cp .env.example .env.local   # paste GATEWAY_API_KEY (blank = mock mode)
npm run dev                  # http://localhost:3000
```

## Layout

```
app/
  page.tsx            the audit console (client)
  docs/page.tsx       in-app documentation
  api/audit/route.ts  orchestration endpoint
lib/
  btl.ts              BTL client + cost-header parsing
  auditors.ts         parallel fan-out to the swarm
  consensus.ts        referee merge + triage
  engine.ts           orchestrator (live + mock)
  prompts.ts          auditor + referee prompts
  mock.ts             canned data for keyless mode
  samples.ts          demo inputs
samples/
  VulnerableVault.sol the demo contract
```

## The models

Swarm: `gpt-4.1` (OpenAI) · `gemini-2.5-flash` (Google) · `mistral-large` (Mistral)
Referee: `qwen3-max` (Qwen) — a fourth, neutral family
All configurable via `.env.local`. For a deeper (slower) audit, swap the auditors to
`gpt-5-5,gemini-2.5-pro,deepseek-v4-pro`.

> Note: bare `claude-*` slugs are Anthropic-native and only serve `/v1/messages`.
> Flex is built entirely on the OpenAI-compatible `/v1/chat/completions` surface,
> so the swarm uses OpenAI-compatible routes across four distinct model families.

---

Flex is a first-pass triage layer, not a substitute for a professional audit.
