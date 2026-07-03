import Nav from "@/components/Nav";

export const metadata = {
  title: "Flex — Docs",
};

export default function Docs() {
  return (
    <>
      <Nav variant="docs" />
      <div className="doc">
        <div className="eyebrow">Documentation</div>
        <h1>How Flex works</h1>
        <p className="lead">
          Flex turns a single, over-confident AI answer into a reconciled verdict
          from a swarm of independent models — and shows you what it cost. This page
          explains the mechanism, the honesty model, and the BTL runtime wiring.
        </p>

        <div className="toc">
          <div className="eyebrow">On this page</div>
          <a href="#idea">1 · The core idea</a>
          <a href="#pipeline">2 · The pipeline</a>
          <a href="#consensus">3 · Consensus &amp; triage</a>
          <a href="#honesty">4 · What Flex does and doesn&apos;t claim</a>
          <a href="#btl">5 · The BTL runtime layer</a>
          <a href="#modes">6 · Modes</a>
          <a href="#run">7 · Running it yourself</a>
        </div>

        <h2 id="idea">1 · The core idea</h2>
        <p>
          Ask one model &ldquo;is this contract safe?&rdquo; and it answers in the
          same confident voice whether it&apos;s certain or guessing. The dangerous
          misses are the quiet ones — the vulnerability it simply doesn&apos;t
          mention.
        </p>
        <p>
          Flex exploits a simple asymmetry:{" "}
          <strong>disagreement between independent models is a reliable warning
          signal.</strong>{" "}
          If three auditors are asked the same question and one flags a critical the
          others missed, that&apos;s not noise — that&apos;s exactly where a human
          should look. Agreement, meanwhile, is a <em>weak positive</em>: reassuring,
          but never a proof of safety.
        </p>

        <h2 id="pipeline">2 · The pipeline</h2>
        <pre>
          <code>{`contract
   │
   ├─►  gpt-4.1           (OpenAI)   ┐
   ├─►  gemini-2.5-flash  (Google)   ├─ parallel, via BTL
   └─►  mistral-large     (Mistral)  ┘
   │
   ▼   each returns structured findings (JSON)
   │
referee  ──►  qwen3-max  merges duplicates, records who flagged what
   │
   ▼
verdict + triaged findings + cost receipt`}</code>
        </pre>
        <p>
          Every auditor is called in parallel, so three opinions cost roughly the
          latency of one. Each is asked to return findings as strict JSON:{" "}
          <code>title</code>, <code>severity</code>, <code>location</code>,{" "}
          <code>description</code>, <code>recommendation</code>. If one model fails or
          returns junk, the run continues with the rest.
        </p>

        <h2 id="consensus">3 · Consensus &amp; triage</h2>
        <p>
          The hard part is that three models describe the <em>same</em> bug in three
          different ways. &ldquo;Reentrancy in withdraw()&rdquo; and &ldquo;external
          call before state update lets an attacker recurse&rdquo; are one finding.
          So a referee model merges them by root cause and location, then records the
          exact set of auditors that reported each one.
        </p>
        <p>From that agreement count, every finding gets a consensus level:</p>
        <ul>
          <li>
            <strong style={{ color: "var(--con-confirmed)" }}>Confirmed</strong> —
            all auditors flagged it. High confidence it&apos;s real.
          </li>
          <li>
            <strong style={{ color: "var(--con-contested)" }}>Contested</strong> —
            a majority flagged it. Probably real; verify.
          </li>
          <li>
            <strong style={{ color: "var(--con-lone)" }}>Lone flag</strong> — only
            one model raised it. Could be a subtle catch the others missed, or a
            false positive. This is the row a human must read.
          </li>
        </ul>

        <h2 id="honesty">4 · What Flex does and doesn&apos;t claim</h2>
        <p>
          Flex is a <strong>first-pass triage layer</strong>, not a replacement for a
          professional audit and not a safety stamp. Three models trained on
          overlapping data can share a blind spot and all miss the same bug — so
          &ldquo;no findings&rdquo; means &ldquo;nothing obvious surfaced,&rdquo; never
          &ldquo;proven safe.&rdquo;
        </p>
        <p>
          What it <em>does</em> do well: it makes silent misses loud. A vulnerability
          that one model catches and another ignores stops being invisible — it
          becomes a labelled, prioritised row telling you where to spend your
          attention before you pay for a real audit.
        </p>

        <h2 id="btl">5 · The BTL runtime layer</h2>
        <p>
          Flex talks to every provider through one endpoint — the BTL runtime, an
          OpenAI-compatible gateway. Without it, three providers means three keys,
          three SDKs, three billing accounts. With it, it&apos;s one client:
        </p>
        <pre>
          <code>{`const client = new OpenAI({
  apiKey: process.env.GATEWAY_API_KEY,
  baseURL: "https://api.badtheorylabs.com/v1",
});`}</code>
        </pre>
        <p>
          Every response carries proof-of-savings headers, which Flex reads with the
          SDK&apos;s <code>.withResponse()</code> and turns into the cost receipt on
          each report:
        </p>
        <ul>
          <li>
            <code>x-btl-benchmark-cost</code> — what the call would have cost direct
          </li>
          <li>
            <code>x-btl-customer-charge</code> — what you actually paid
          </li>
          <li>
            <code>x-btl-saved</code> — the delta from routing and caching
          </li>
          <li>
            <code>x-btl-cache-tier</code> — whether the response was served from cache
          </li>
        </ul>
        <p>
          Running a swarm costs more calls than a single model — Flex answers that
          objection head-on by showing the routing and cache savings BTL returns on
          every run.
        </p>

        <h2 id="modes">6 · Modes</h2>
        <ul>
          <li>
            <strong>Contract audit</strong> — the flagship. Solidity/EVM security
            review with a vulnerability-class checklist baked into the auditor prompt.
          </li>
          <li>
            <strong>Code review</strong> — the same swarm pointed at a general code
            snippet for bugs and security issues.
          </li>
          <li>
            <strong>Question</strong> — ask a technical question you&apos;re about to
            trust; risky or commonly-wrong claims are surfaced as findings.
          </li>
        </ul>

        <h2 id="run">7 · Running it yourself</h2>
        <pre>
          <code>{`npm install
cp .env.example .env.local   # paste your BTL key
npm run dev                  # http://localhost:3000`}</code>
        </pre>
        <p>
          With no key set, Flex runs in <strong>mock mode</strong> — the full
          interface works against canned data so you can explore it offline. Add{" "}
          <code>GATEWAY_API_KEY</code> and it goes live against the real swarm.
        </p>
        <hr />
        <p className="foot-meta">
          Flex · built for the BTL Runtime Hackathon 2026 · the one rule: every
          project calls the runtime. Flex calls it four times per audit.
        </p>
      </div>
    </>
  );
}
