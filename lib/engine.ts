import { hasKey } from "./btl";
import { runAuditors } from "./auditors";
import { reconcile } from "./consensus";
import { mockAuditors, mockMerged } from "./mock";
import type {
  AuditResult,
  AuditSummary,
  BtlCost,
  Mode,
  MergedFinding,
} from "./types";

function auditorModels(): string[] {
  return (process.env.FLEX_AUDITORS || "gpt-4.1,gemini-2.5-flash,mistral-large")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function refereeModel(): string {
  return process.env.FLEX_REFEREE || "qwen3-max";
}

function summarize(findings: MergedFinding[]): AuditSummary {
  const s: AuditSummary = {
    critical: 0, high: 0, medium: 0, low: 0, info: 0,
    confirmed: 0, contested: 0, lone: 0,
  };
  for (const f of findings) {
    s[f.severity]++;
    s[f.consensus]++;
  }
  return s;
}

function receiptFrom(costs: BtlCost[]) {
  const totalCharge = costs.reduce((a, c) => a + (c.customerCharge || 0), 0);
  const totalBenchmark = costs.reduce((a, c) => a + (c.benchmarkCost || 0), 0);
  const totalSaved = costs.reduce((a, c) => a + (c.saved || 0), 0);
  // BTL doesn't reliably emit a cache-tier header, so "discounted" = calls where
  // routing/cache/shared-savings actually returned money.
  const discounted = costs.filter((c) => (c.saved || 0) > 0).length;
  // "Would've cost" = the higher of benchmark vs (charge+saved), so the number is
  // always coherent even when the gateway reports a low benchmark on a fresh call.
  const wouldveCost = Math.max(totalBenchmark, totalCharge + totalSaved);
  const savedPct =
    wouldveCost > 0 ? Math.round((totalSaved / wouldveCost) * 100) : 0;
  return {
    calls: costs.length,
    discounted,
    totalCharge,
    wouldveCost,
    totalSaved,
    savedPct,
  };
}

/** Mock receipt models a cache-warm run (the impressive, honest steady state). */
function mockReceipt() {
  return {
    calls: 4,
    discounted: 4,
    totalCharge: 0.043523,
    wouldveCost: 0.087049,
    totalSaved: 0.043526,
    savedPct: 50,
  };
}

function forceMock(): boolean {
  return process.env.FLEX_FORCE_MOCK === "1";
}

export async function runAudit(mode: Mode, input: string): Promise<AuditResult> {
  const started = Date.now();
  const referee = refereeModel();

  if (!hasKey() || forceMock()) {
    // MOCK MODE — no API key, or FLEX_FORCE_MOCK=1 (offline / demo-safety switch).
    // Fully wired UI against canned data so a demo never depends on credits/wifi.
    const models = auditorModels();
    const auditors = mockAuditors(models);
    const merged = mockMerged(models);
    return {
      mode,
      headline: merged.headline,
      summary: summarize(merged.findings),
      findings: merged.findings,
      auditors: auditors.map((a) => ({
        model: a.model,
        provider: a.provider,
        findings: a.findings,
        raw: a.raw,
        costLabel: undefined,
      })),
      receipt: mockReceipt(),
      meta: { durationMs: Date.now() - started, usedMock: true, refereeModel: referee },
    };
  }

  // LIVE MODE — real BTL calls.
  const models = auditorModels();
  const auditors = await runAuditors(models, mode, input);
  const { findings, headline, cost: refCost } = await reconcile(referee, auditors);

  const costs: BtlCost[] = [
    ...auditors.map((a) => a.cost).filter((c): c is BtlCost => Boolean(c)),
    refCost,
  ];

  return {
    mode,
    headline,
    summary: summarize(findings),
    findings,
    auditors: auditors.map((a) => ({
      model: a.model,
      provider: a.provider,
      findings: a.findings,
      raw: a.raw,
      error: a.error,
      costLabel: a.cost
        ? `$${a.cost.customerCharge.toFixed(4)}`
        : undefined,
    })),
    receipt: receiptFrom(costs),
    meta: { durationMs: Date.now() - started, usedMock: false, refereeModel: referee },
  };
}
