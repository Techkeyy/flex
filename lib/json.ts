// Robust JSON extraction — models sometimes wrap JSON in prose or code fences.

export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;

  // Strip ```json ... ``` fences if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;

  // Try a direct parse first.
  try {
    return JSON.parse(candidate) as T;
  } catch {
    // fall through
  }

  // Otherwise grab the outermost {...} block.
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(candidate.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
  return null;
}

const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;

export function normalizeSeverity(s: unknown): (typeof SEVERITIES)[number] {
  const v = String(s ?? "").toLowerCase().trim();
  return (SEVERITIES as readonly string[]).includes(v)
    ? (v as (typeof SEVERITIES)[number])
    : "info";
}
