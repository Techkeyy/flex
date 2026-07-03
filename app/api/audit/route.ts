import { NextRequest, NextResponse } from "next/server";
import { runAudit } from "@/lib/engine";
import type { Mode } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODES: Mode[] = ["contract", "code", "question"];

export async function POST(req: NextRequest) {
  let body: { mode?: string; input?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = (body.mode ?? "contract") as Mode;
  const input = (body.input ?? "").trim();

  if (!MODES.includes(mode)) {
    return NextResponse.json({ error: `Unknown mode "${mode}".` }, { status: 400 });
  }
  if (!input) {
    return NextResponse.json({ error: "Nothing to audit — input is empty." }, { status: 400 });
  }
  if (input.length > 40000) {
    return NextResponse.json({ error: "Input too large (40k char limit)." }, { status: 413 });
  }

  try {
    const result = await runAudit(mode, input);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
