import type { Mode } from "./types";

const SEVERITY_GUIDE = `Severity must be one of: "critical", "high", "medium", "low", "info".
- critical: funds can be stolen/locked or contract bricked (reentrancy on value transfer, broken access control on withdraw, unchecked delegatecall).
- high: serious exploit under realistic conditions.
- medium: exploitable with preconditions or causes meaningful harm.
- low: minor / best-practice / gas.
- info: stylistic or informational only.`;

const JSON_SHAPE = `Return ONLY a JSON object of this exact shape, no prose, no markdown fences:
{
  "findings": [
    {
      "title": "short vulnerability name",
      "severity": "critical|high|medium|low|info",
      "location": "function name and/or line reference",
      "description": "what the bug is and how it is exploited, concretely",
      "recommendation": "the concrete fix"
    }
  ]
}
If you find nothing, return {"findings": []}. Do not invent issues to seem thorough — false positives are penalized.`;

export function auditorSystemPrompt(mode: Mode): string {
  if (mode === "contract") {
    return `You are a senior smart-contract security auditor reviewing Solidity/EVM code.
Find real, exploitable vulnerabilities. Consider: reentrancy, access control, integer over/underflow,
unchecked external calls, delegatecall, tx.origin auth, front-running/MEV, oracle manipulation,
uninitialized/unprotected proxies, denial of service, signature replay, and unsafe ERC20 handling.

The input may be Solidity source OR a fully compiled contract string (a long 0x… EVM bytecode blob).
If it is bytecode, disassemble/decompile it mentally and reason about the opcode and control flow for the
same vulnerability classes (delegatecall, selfdestruct, unprotected SSTORE of owner slots, missing auth on
external calls, etc.). Because source-level context is absent, be explicit in each finding's description
that it is derived from bytecode, and keep confidence proportionate.
${SEVERITY_GUIDE}
${JSON_SHAPE}`;
  }
  if (mode === "code") {
    return `You are a senior software security reviewer. Find real bugs and security issues in the code:
injection, auth flaws, unsafe deserialization, race conditions, resource leaks, and logic errors.
${SEVERITY_GUIDE}
${JSON_SHAPE}`;
  }
  // question
  return `You are a careful technical expert. Answer the developer's question, and surface any claims
that are commonly gotten wrong or that carry security/correctness risk. Treat each such claim as a "finding".
${SEVERITY_GUIDE}
${JSON_SHAPE}`;
}

export function auditorUserPrompt(mode: Mode, input: string): string {
  const label =
    mode === "contract"
      ? "Contract to review (Solidity source or compiled 0x… bytecode)"
      : mode === "code"
        ? "Code"
        : "Question";
  return `${label} to review:\n\n${input}`;
}

/** The referee clusters the same vulnerability reported by different auditors. */
export function refereeSystemPrompt(): string {
  return `You are the lead reviewer reconciling reports from several independent AI auditors.
Different auditors describe the SAME underlying vulnerability in different words. Your job is to
merge them into one deduplicated list, and record which auditors flagged each one.

Rules:
- Two findings are the SAME if they describe the same root cause at the same location, even if worded differently.
- Keep the clearest title, the most accurate severity (favor the higher severity if auditors disagree, but do not inflate), and write one clean description + recommendation.
- "modelsAgreed" MUST list exactly the auditor model ids that reported that vulnerability.
- Do NOT add vulnerabilities that no auditor reported.

Return ONLY this JSON, no prose, no fences:
{
  "headline": "one-sentence plain-English summary of the contract's risk posture",
  "findings": [
    {
      "title": "...",
      "severity": "critical|high|medium|low|info",
      "location": "...",
      "description": "...",
      "recommendation": "...",
      "modelsAgreed": ["model-id", "..."]
    }
  ]
}`;
}

export function refereeUserPrompt(
  reports: Array<{ model: string; findings: unknown }>
): string {
  const blocks = reports
    .map(
      (r) =>
        `### Auditor: ${r.model}\n${JSON.stringify(r.findings, null, 2)}`
    )
    .join("\n\n");
  return `Here are the independent auditor reports. Merge them.\n\n${blocks}`;
}
