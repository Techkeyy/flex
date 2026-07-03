import OpenAI from "openai";
import type { BtlCost } from "./types";

export const BTL_BASE_URL =
  process.env.BTL_BASE_URL || "https://api.badtheorylabs.com/v1";

/** Returns a configured client, or null when no key is set (→ mock mode). */
export function getClient(): OpenAI | null {
  const apiKey = process.env.GATEWAY_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL: BTL_BASE_URL });
}

export function hasKey(): boolean {
  return Boolean(process.env.GATEWAY_API_KEY);
}

/** Map a model slug to its provider, for display. */
export function providerOf(model: string): string {
  const m = model.toLowerCase();
  if (m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3")) return "OpenAI";
  if (m.startsWith("claude")) return "Anthropic";
  if (m.startsWith("deepseek")) return "DeepSeek";
  if (m.startsWith("gemini")) return "Google";
  if (m.startsWith("llama")) return "Meta";
  if (m.startsWith("mistral")) return "Mistral";
  if (m.startsWith("qwen")) return "Qwen";
  if (m.startsWith("btl")) return "BTL Router";
  return "BTL";
}

function num(headers: Headers, key: string): number {
  const v = headers.get(key);
  if (!v) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/** Pull the BTL proof-of-savings headers off a raw response. */
export function parseCostHeaders(headers: Headers): BtlCost {
  return {
    requestId: headers.get("x-btl-request-id") || undefined,
    cacheTier: headers.get("x-btl-cache-tier") || undefined,
    benchmarkCost: num(headers, "x-btl-benchmark-cost"),
    customerCharge: num(headers, "x-btl-customer-charge"),
    saved: num(headers, "x-btl-saved"),
  };
}

export interface ChatResult {
  content: string;
  cost: BtlCost;
  model: string;
}

/**
 * One chat call through BTL, capturing both the content and the cost headers.
 * Uses `.withResponse()` so we can read the proof headers the gateway attaches.
 */
export async function chat(
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<ChatResult> {
  const client = getClient();
  if (!client) throw new Error("No GATEWAY_API_KEY set");

  const { data, response } = await client.chat.completions
    .create({
      model,
      messages,
      temperature: opts.temperature ?? 0.1,
      // Headroom so reasoning models (e.g. gemini-2.5-pro) don't burn the budget
      // before emitting, and so long findings JSON is never truncated.
      max_tokens: opts.maxTokens ?? 4096,
    })
    .withResponse();

  return {
    content: data.choices[0]?.message?.content ?? "",
    cost: parseCostHeaders(response.headers),
    model,
  };
}
