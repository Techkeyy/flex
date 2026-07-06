import type { SourceMeta } from "./types";

// A bare EVM contract address, nothing else on the line.
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function isAddress(input: string): boolean {
  return ADDRESS_RE.test(input.trim());
}

function chainId(): number {
  const n = parseInt(process.env.FLEX_CHAIN_ID || "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum mainnet",
  10: "Optimism",
  56: "BNB Chain",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum",
};

function chainName(): string {
  return CHAIN_NAMES[chainId()] || `chain ${chainId()}`;
}

/** Etherscan's V2 multichain endpoint — one host + key for every chain. */
async function etherscan(
  params: Record<string, string>,
  signal: AbortSignal
): Promise<any> {
  const qs = new URLSearchParams({
    chainid: String(chainId()),
    apikey: process.env.ETHERSCAN_API_KEY || "",
    ...params,
  });
  const res = await fetch(`https://api.etherscan.io/v2/api?${qs}`, { signal });
  if (!res.ok) throw new Error(`explorer HTTP ${res.status}`);
  return res.json();
}

/**
 * Etherscan's `SourceCode` field is one of three shapes:
 *  - raw Solidity,
 *  - a JSON sources map `{ "F.sol": { content } }` (legacy multi-file), or
 *  - a standard-json-input blob wrapped in an extra pair of braces `{{ ... }}`.
 * Flatten any of them into a single readable Solidity string for the swarm.
 */
function flattenSource(sourceCode: string): string {
  const s = sourceCode.trim();
  const unwrapped = s.startsWith("{{") && s.endsWith("}}") ? s.slice(1, -1) : s;
  if (unwrapped.startsWith("{")) {
    try {
      const parsed = JSON.parse(unwrapped);
      const sources = parsed.sources ?? parsed;
      const parts: string[] = [];
      for (const [file, obj] of Object.entries<any>(sources)) {
        const content = obj?.content;
        if (typeof content === "string") {
          parts.push(`// ===== ${file} =====\n${content}`);
        }
      }
      if (parts.length) return parts.join("\n\n");
    } catch {
      // not JSON after all — fall through and use the raw string
    }
  }
  return sourceCode;
}

export interface Resolved {
  input: string;
  source: SourceMeta;
}

/**
 * If the input is a bare contract address, fetch its REAL code from the block
 * explorer so the swarm audits actual verified source (or, failing that, raw
 * bytecode) — instead of quizzing the models on whether they remember the
 * address. Anything that isn't an address passes straight through as "inline".
 */
export async function resolveContractInput(input: string): Promise<Resolved> {
  const address = input.trim();
  if (!isAddress(address)) {
    return { input, source: { kind: "inline" } };
  }

  const chain = chainName();
  const base = { address, chainId: chainId() };

  if (!process.env.ETHERSCAN_API_KEY) {
    return {
      input,
      source: {
        ...base,
        kind: "address-unfetched",
        note: `No ETHERSCAN_API_KEY set, so on-chain code can't be fetched — the swarm is reasoning about the address from memory, which is unreliable. Set the key or paste source for a real audit.`,
      },
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const data = await etherscan(
      { module: "contract", action: "getsourcecode", address },
      controller.signal
    );
    const entry = Array.isArray(data?.result) ? data.result[0] : undefined;
    const verified =
      entry &&
      entry.SourceCode &&
      entry.ABI !== "Contract source code not verified";

    if (verified) {
      const name = String(entry.ContractName || "").trim() || undefined;
      return {
        input: flattenSource(String(entry.SourceCode)),
        source: {
          ...base,
          kind: "address-source",
          contractName: name,
          note: `Verified source fetched from ${chain}${name ? ` — ${name}` : ""}. The swarm audited the real code, not a guess from the address.`,
        },
      };
    }

    // Unverified: fall back to the raw deployed bytecode (best-effort).
    const codeData = await etherscan(
      { module: "proxy", action: "eth_getCode", address, tag: "latest" },
      controller.signal
    );
    const bytecode =
      typeof codeData?.result === "string" ? codeData.result : "";
    if (bytecode && bytecode !== "0x" && bytecode.length > 4) {
      return {
        input: bytecode,
        source: {
          ...base,
          kind: "address-bytecode",
          note: `Contract is unverified on ${chain} — auditing raw bytecode with no source. Findings are low-confidence.`,
        },
      };
    }

    return {
      input,
      source: {
        ...base,
        kind: "address-unfetched",
        note: `No contract code found at this address on ${chain} — it may be an EOA, self-destructed, or on a different chain (set FLEX_CHAIN_ID).`,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return {
      input,
      source: {
        ...base,
        kind: "address-unfetched",
        note: `Couldn't reach the explorer (${msg}). Auditing a bare address from model memory is unreliable — paste source for a real audit.`,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
