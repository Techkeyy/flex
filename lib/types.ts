// Shared types for the Flex audit engine.

export type Mode = "contract" | "code" | "question";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Consensus = "confirmed" | "contested" | "lone";

/** A single finding as reported by one auditor model. */
export interface RawFinding {
  title: string;
  severity: Severity;
  location: string;
  description: string;
  recommendation: string;
}

/** What one auditor returned (or failed to return). */
export interface AuditorResult {
  model: string;
  provider: string;
  findings: RawFinding[];
  raw: string;
  error?: string;
  cost?: BtlCost;
}

/** A finding after the referee merges the same vuln across auditors. */
export interface MergedFinding {
  id: string;
  title: string;
  severity: Severity;
  location: string;
  description: string;
  recommendation: string;
  /** Which auditor models independently flagged this vuln. */
  modelsAgreed: string[];
  modelsTotal: number;
  consensus: Consensus;
}

/** BTL cost/savings proof, parsed from response headers. */
export interface BtlCost {
  requestId?: string;
  cacheTier?: string;
  benchmarkCost: number;
  customerCharge: number;
  saved: number;
}

export interface Receipt {
  calls: number;
  discounted: number;
  totalCharge: number;
  wouldveCost: number;
  totalSaved: number;
  savedPct: number;
}

export interface AuditSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  confirmed: number;
  contested: number;
  lone: number;
}

export type PostureLevel = "clean" | "no-consensus" | "corroborated";

/** Data-driven honesty line, computed from consensus — never from model prose. */
export interface Posture {
  level: PostureLevel;
  line: string;
}

export interface AuditResult {
  mode: Mode;
  headline: string;
  posture: Posture;
  summary: AuditSummary;
  findings: MergedFinding[];
  auditors: Array<Omit<AuditorResult, "cost"> & { costLabel?: string }>;
  receipt: Receipt;
  meta: {
    durationMs: number;
    usedMock: boolean;
    refereeModel: string;
    bytecodeMode: boolean;
  };
}
