import type { AssetSymbol } from "@/lib/config/assets";
import type { OneClickToken } from "./oneclick-client";

/**
 * Preferred settlement chains per Nearvora asset. 1Click lists the same symbol
 * on several chains, so the adapter needs a deterministic choice. Override any
 * entry with NEAR_INTENTS_ASSET_MAP when a deployment needs a specific assetId.
 */
const PREFERRED_BLOCKCHAINS: Record<Exclude<AssetSymbol, "NGN">, string[]> = {
  USDT: ["near", "eth", "tron", "bsc", "arb", "base", "sol", "pol", "op"],
  USDC: ["near", "eth", "base", "arb", "sol", "pol", "op", "bsc", "tron"],
  BTC: ["btc", "near"],
  ETH: ["eth", "arb", "base", "near", "op", "pol"],
  SOL: ["sol", "near"],
  BNB: ["bsc", "near"],
};

const SYMBOL_ALIASES: Partial<Record<AssetSymbol, string[]>> = {
  ETH: ["ETH", "WETH"],
  BTC: ["BTC", "WBTC"],
  SOL: ["SOL", "WSOL"],
  BNB: ["BNB", "WBNB"],
};

export class IntentsAssetUnavailableError extends Error {
  readonly code = "INTENTS_ASSET_UNAVAILABLE";

  constructor(symbol: AssetSymbol, reason: string) {
    super(`1Click cannot quote ${symbol}: ${reason}`);
    this.name = "IntentsAssetUnavailableError";
  }
}

export function resolveAssetId(
  symbol: AssetSymbol,
  tokens: OneClickToken[],
  overrides: Record<string, string> = {},
): string {
  const override = overrides[symbol];
  if (override) return override;

  if (symbol === "NGN") {
    throw new IntentsAssetUnavailableError(
      symbol,
      "naira is settled by a payment provider, not by NEAR Intents",
    );
  }

  const aliases = new Set((SYMBOL_ALIASES[symbol] ?? [symbol]).map(normalizeSymbol));
  const candidates = tokens.filter((token) => aliases.has(normalizeSymbol(token.symbol)));
  if (candidates.length === 0) {
    throw new IntentsAssetUnavailableError(symbol, "no supported 1Click token was found");
  }

  const preferred = PREFERRED_BLOCKCHAINS[symbol];
  candidates.sort((a, b) => {
    const aRank = rank(a.blockchain, preferred);
    const bRank = rank(b.blockchain, preferred);
    if (aRank !== bRank) return aRank - bRank;
    return a.assetId.localeCompare(b.assetId);
  });

  return candidates[0].assetId;
}

function rank(blockchain: string, preferred: string[]): number {
  const index = preferred.indexOf(blockchain.toLowerCase());
  return index === -1 ? preferred.length : index;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}
