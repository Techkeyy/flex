"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import { SAMPLES, PLACEHOLDER } from "@/lib/samples";
import type { AuditResult, Mode, MergedFinding } from "@/lib/types";

const MODE_LABELS: Record<Mode, string> = {
  contract: "Contract audit",
  code: "Code review",
  question: "Question",
};

function usd(n: number): string {
  if (n === 0) return "$0";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("contract");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  async function run() {
    setError(null);
    setResult(null);
    if (!input.trim()) {
      setError("Nothing to audit yet — paste a contract or load the sample.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed.");
      setResult(data as AuditResult);
      // auto-open the top finding
      if (data.findings?.[0]) setOpen({ [data.findings[0].id]: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />

      {/* HERO */}
      <header className="hero">
        <div className="wrap">
          <div className="eyebrow">Multi-model security triage · Solidity / EVM</div>
          <h1>
            One contract.<br />
            Three auditors.<br />
            <em>One honest verdict.</em>
          </h1>
          <p className="lede">
            A single AI misses things and says nothing. Flex sends your contract to{" "}
            <b>three independent models at once</b>, then reconciles them: what they{" "}
            <b>all</b> catch is confirmed — where one <b>dissents</b>, you know exactly
            where to look. It doesn&apos;t claim your code is safe. It tells you how much
            to trust the review.
          </p>
        </div>
      </header>

      {/* CONSOLE */}
      <section id="console" className="wrap">
        <div className="console">
          <div className="console-head">
            <div className="modes">
              {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
                <button
                  key={m}
                  className={`mode ${mode === m ? "active" : ""}`}
                  onClick={() => {
                    setMode(m);
                    setResult(null);
                    setError(null);
                  }}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
            <div className="samples">
              <button
                className="samplebtn"
                onClick={() => setInput(SAMPLES[mode].value)}
              >
                {SAMPLES[mode].label}
              </button>
              {input && (
                <button className="samplebtn" onClick={() => setInput("")}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="editor">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={PLACEHOLDER[mode]}
              spellCheck={false}
            />
          </div>

          <div className="console-foot">
            <div className="foot-meta">
              swarm: <b>three models · three providers</b> &nbsp;→&nbsp; neutral
              referee: <b>a fourth family</b>
            </div>
            <button className="btn btn-primary" onClick={run} disabled={loading}>
              {loading ? "Auditing…" : "Run the swarm"}
            </button>
          </div>
        </div>

        {error && <div className="banner err">{error}</div>}
        {loading && (
          <div className="banner info">
            <span className="spinner" />
            Fanning out to three providers through BTL and reconciling their
            findings… this takes a few seconds.
          </div>
        )}

        {result && <Results result={result} open={open} setOpen={setOpen} usd={usd} />}
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="sec alt">
        <div className="wrap">
          <div className="eyebrow">How it works</div>
          <h2>Disagreement is the signal.</h2>
          <div className="steps">
            <div className="step">
              <div className="n">01</div>
              <h3>Fan out</h3>
              <p>
                Your contract goes to three models from three providers at once —
                one BTL key, one endpoint, one call fan. Diverse models catch
                different bug classes.
              </p>
            </div>
            <div className="step">
              <div className="n">02</div>
              <h3>Reconcile</h3>
              <p>
                A referee model merges the same vulnerability across auditors, even
                when they word it differently, and records who flagged what.
              </p>
            </div>
            <div className="step">
              <div className="n">03</div>
              <h3>Triage</h3>
              <p>
                All three agree → <b>confirmed</b>. Two of three → <b>contested</b>.
                A lone flag → <b>needs review</b>: a subtle catch, or a false
                positive. You decide with eyes open.
              </p>
            </div>
            <div className="step">
              <div className="n">04</div>
              <h3>Prove the cost</h3>
              <p>
                Every run shows real spend and what BTL&apos;s routing and cache
                saved you — straight from the gateway&apos;s response headers.
              </p>
            </div>
          </div>

          <div className="note">
            <div className="eyebrow">The honest part</div>
            <p>
              Flex is a first-pass triage layer, not a substitute for a professional
              audit. Agreement between models is a strong signal, not a proof of
              safety — models can share blind spots. Flex is loudest exactly where it
              should be: when the auditors disagree.
            </p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap footer-inner">
          <div className="brand">
            <span className="brand-mark">F</span>
            <span className="brand-name">Flex</span>
          </div>
          <div className="muted">
            Built on the BTL runtime · BTL Runtime Hackathon 2026
          </div>
          <a className="navlink" href="/docs">
            Read the docs →
          </a>
        </div>
      </footer>
    </>
  );
}

/* ---------- Results ---------- */

function Results({
  result,
  open,
  setOpen,
  usd,
}: {
  result: AuditResult;
  open: Record<string, boolean>;
  setOpen: (o: Record<string, boolean>) => void;
  usd: (n: number) => string;
}) {
  const { summary, findings, receipt, auditors, meta } = result;

  return (
    <div className="results">
      {meta.usedMock && (
        <div className="banner info" style={{ marginBottom: 16 }}>
          Running in <b>mock mode</b> — no BTL key set. Numbers and findings are
          illustrative. Add <code style={{ fontFamily: "var(--font-mono)" }}>
          GATEWAY_API_KEY</code> to go live.
        </div>
      )}

      <div className="verdict">
        <div className="eyebrow">Reconciled verdict</div>
        <h2>{result.headline}</h2>

        <div className="stats">
          <Stat k="Critical" v={summary.critical} />
          <Stat k="High" v={summary.high} />
          <Stat k="Medium" v={summary.medium} />
          <Stat k="Confirmed" v={summary.confirmed} />
          <Stat k="Needs review" v={summary.lone} />
        </div>

        <div className="receipt">
          <div className="r-item">
            <span className="r-k">Models called</span>
            <span className="r-v num">{receipt.calls}</span>
          </div>
          <div className="r-item">
            <span className="r-k">Would&apos;ve cost</span>
            <span className="r-v num">{usd(receipt.wouldveCost)}</span>
          </div>
          <div className="r-item">
            <span className="r-k">You paid</span>
            <span className="r-v num">{usd(receipt.totalCharge)}</span>
          </div>
          <div className="r-item">
            <span className="r-k">Saved by BTL</span>
            <span className="r-v accent num">{usd(receipt.totalSaved)}</span>
          </div>
          {receipt.savedPct > 0 ? (
            <span className="r-tag num">↓ {receipt.savedPct}% via BTL routing + cache</span>
          ) : (
            <span className="r-tag num" style={{ color: "var(--text-3)" }}>
              cold run · re-audit to see cache savings
            </span>
          )}
        </div>
      </div>

      <div className="findings">
        {findings.length === 0 && (
          <div className="banner info">
            No findings surfaced. In a real audit, treat that as &ldquo;nothing
            obvious&rdquo; — not &ldquo;proven safe.&rdquo;
          </div>
        )}
        {findings.map((f) => (
          <Finding
            key={f.id}
            f={f}
            isOpen={!!open[f.id]}
            toggle={() => setOpen({ ...open, [f.id]: !open[f.id] })}
          />
        ))}
      </div>

      {/* the debate */}
      <div className="debate">
        <div className="eyebrow">The debate · raw auditor outputs</div>
        <div className="debate-grid">
          {auditors.map((a) => (
            <div key={a.model} className="auditor">
              <div className="auditor-head">
                <span className="auditor-model num">{a.model}</span>
                <span className="auditor-prov">{a.provider}</span>
              </div>
              {a.error ? (
                <div className="err">error: {a.error}</div>
              ) : a.findings.length === 0 ? (
                <div className="foot-meta">No issues reported.</div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {a.findings.map((raw, i) => (
                    <li key={i}>
                      <span style={{ color: "var(--text-1)" }}>{raw.title}</span>{" "}
                      <span className="foot-meta">({raw.severity})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="stat">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}

function Finding({
  f,
  isOpen,
  toggle,
}: {
  f: MergedFinding;
  isOpen: boolean;
  toggle: () => void;
}) {
  const conLabel =
    f.consensus === "confirmed"
      ? `Confirmed ${f.modelsAgreed.length}/${f.modelsTotal}`
      : f.consensus === "contested"
        ? `Contested ${f.modelsAgreed.length}/${f.modelsTotal}`
        : `Lone flag 1/${f.modelsTotal}`;

  return (
    <div className="finding">
      <div className="finding-head" onClick={toggle}>
        <span className="finding-id num">{f.id}</span>
        <div className="finding-main">
          <p className="finding-title">{f.title}</p>
          <span className="finding-loc">{f.location}</span>
        </div>
        <div className="finding-badges">
          <span className={`sev sev-${f.severity}`}>{f.severity}</span>
          <span className={`con con-${f.consensus}`}>
            <span className="cdot" />
            {conLabel}
          </span>
        </div>
      </div>
      {isOpen && (
        <div className="finding-body">
          <p>{f.description}</p>
          <div className="fix">
            <span className="fixk">Recommended fix</span>
            <p>{f.recommendation}</p>
          </div>
          <div className="agreed">
            <span className="lbl">Flagged by</span>
            {f.modelsAgreed.map((m) => (
              <span key={m} className="chip on">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
