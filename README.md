# Flex — the multi-model contract audit swarm

**One Solidity contract → three independent AI auditors → one honest, consensus-weighted verdict.**

Built for the **BTL Runtime Hackathon 2026**. Every model call goes through the
BTL runtime — the OpenAI-compatible gateway that is the one rule of the event.

**Live:** https://flex-navy-gamma.vercel.app · **Docs:** `/docs`

---

## The problem

A single AI auditor answers in the same confident voice whether it is certain or
guessing. The dangerous misses are the quiet ones — the vulnerability it simply
never mentions, and the plausible-sounding one it invents.

Flex turns one confident opinion into a reconciled verdict from a **swarm**. It
sends your contract to three models from three providers *at once*, then a fourth
neutral model reconciles them. **Disagreement is the signal.**

## How to read a result

Flex leads with a **data-driven posture** computed from consensus — never from
model prose — so a single model's hallucination can never be dressed up as an
authoritative finding:

| Verdict | Meaning | Trust |
| --- | --- | --- |
| **Corroborated** | flagged by 2+ auditors independently | real risk — act on it |
| **Unverified (lone)** | one model only | a lead to check, or noise — collapsed by default |
| **No consensus** | nothing corroborated | on sound code, the expected result |

Findings the whole swarm agrees on rise to the top; single-model flags are
quarantined as "likely noise." Validated both directions: real bugs (e.g. an
unprotected `mint`, reentrancy) get **corroborated**; safe contracts (WETH9,
a sound factory) produce **zero corroborated** findings.

Flex is a first-pass triage layer, not a substitute for a professional audit.
Agreement is a strong signal, not a proof of safety — models can share blind
spots. Flex is loudest exactly where it should be: when the auditors disagree.

## Why BTL

Three providers would normally mean three keys, three SDKs, three bills. The BTL
runtime collapses that to **one OpenAI-compatible endpoint and one key**. And
every response carries proof-of-savings headers (`x-btl-saved`,
`x-btl-customer-charge`, `x-btl-benchmark-cost`) — Flex surfaces them as a **cost
receipt** on every audit, answering the "isn't a swarm expensive?" objection
head-on.

## Modes

- **Contract audit** — Solidity/EVM security review (source *or* compiled `0x…`
  bytecode; bytecode is flagged as low-confidence).
- **Code review** — general bug/security review of a snippet.
- **Question** — ask a technical question; risky or commonly-wrong claims surface
  as findings.

## Tech stack

- **Next.js (App Router) + TypeScript** — one app, backend in API routes
- **OpenAI SDK** pointed at `https://api.badtheorylabs.com/v1`
- Hand-crafted CSS design system (no UI framework)
- **Mock mode** — the full app works with no key, for offline/credit-free demos

## Getting started

```bash
npm install
cp .env.example .env.local   # add your GATEWAY_API_KEY
npm run dev                  # http://localhost:3000
```

With no key set (or `FLEX_FORCE_MOCK=1`), Flex runs in mock mode against canned
data so you can explore it offline.

## Configuration

Set in `.env.local` (or your host's environment):

| Variable | Purpose |
| --- | --- |
| `GATEWAY_API_KEY` | BTL runtime key (required for live audits) |
| `BTL_BASE_URL` | Gateway base URL (default `https://api.badtheorylabs.com/v1`) |
| `FLEX_AUDITORS` | Comma-separated auditor models (default strong lineup below) |
| `FLEX_REFEREE` | The reconciling model (default `qwen3-max`) |
| `FLEX_FORCE_MOCK` | `1` forces mock mode — a demo-safety switch |

**Default swarm:** `gpt-5-5` (OpenAI) · `gemini-2.5-pro` (Google) ·
`deepseek-v4-pro` (DeepSeek), refereed by `qwen3-max` (Qwen) — four distinct
model families. For a faster, cheaper (slightly noisier) demo, use
`gpt-4.1,gemini-2.5-flash,mistral-large`.

> Note: bare `claude-*` slugs are Anthropic-native and only serve `/v1/messages`.
> Flex is built entirely on the OpenAI-compatible `/v1/chat/completions` surface.

## Project structure

```
app/
  page.tsx             audit console (client)
  docs/page.tsx        in-app documentation
  api/audit/route.ts   orchestration endpoint
components/
  Nav.tsx              shared navigation
lib/
  engine.ts            orchestrator (live + mock) + posture
  btl.ts               BTL client + cost-header parsing
  auditors.ts          parallel fan-out to the swarm
  consensus.ts         referee merge + triage
  prompts.ts           auditor + referee prompts (anti-fabrication)
  json.ts              robust JSON extraction
  mock.ts              canned data for keyless/demo mode
  samples.ts           demo inputs
  types.ts             shared types
samples/
  VulnerableVault.sol  the demo contract
```

## How it works

```
contract
   │
   ├─►  gpt-5-5          (OpenAI)    ┐
   ├─►  gemini-2.5-pro   (Google)    ├─ parallel, one BTL key
   └─►  deepseek-v4-pro  (DeepSeek)  ┘
   │
   ▼   each returns structured findings (JSON)
   │
referee  ──►  qwen3-max   merges duplicates, records who flagged what
   │
   ▼
posture + corroborated findings + cost receipt
```

## License

MIT. Built for the BTL Runtime Hackathon 2026 — you own what you build.
