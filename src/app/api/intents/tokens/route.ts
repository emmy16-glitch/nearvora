import {
  handleRoute,
  ok,
  requireSession,
  ApiError,
} from "@/lib/api/handler";
import { CRYPTO_SYMBOLS } from "@/lib/config/assets";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { getNearIntentsAdapter, IntentsError } from "@/lib/services/intents";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireSession();
    const limit = rateLimit(clientKey(request, "intents:tokens"), 60);
    if (!limit.allowed) {
      throw new ApiError(429, "RATE_LIMITED", "Too many token requests. Try again shortly.");
    }

    const adapter = getNearIntentsAdapter();
    if (!adapter.isConfigured() || adapter.mode !== "live") {
      throw new ApiError(
        503,
        "INTENTS_NOT_CONFIGURED",
        "Live 1Click token discovery is not configured.",
      );
    }

    let tokens;
    try {
      tokens = await adapter.getSupportedTokens();
    } catch (error) {
      if (error instanceof IntentsError) {
        throw new ApiError(error.status, error.code, error.message);
      }
      throw error;
    }

    const supported = new Set<string>(CRYPTO_SYMBOLS);
    const data = tokens
      .filter((token) => supported.has(token.symbol.toUpperCase()))
      .map((token) => ({
        assetId: token.assetId,
        symbol: token.symbol.toUpperCase(),
        blockchain: token.blockchain,
        decimals: token.decimals,
      }))
      .sort(
        (a, b) =>
          a.symbol.localeCompare(b.symbol) ||
          chainRank(a.blockchain) - chainRank(b.blockchain) ||
          a.blockchain.localeCompare(b.blockchain),
      );

    return ok(data, { simulated: false, provider: "1click" });
  });
}

function chainRank(blockchain: string): number {
  const order = ["eth", "near", "base", "arb", "btc", "sol", "bsc", "pol", "op", "tron"];
  const index = order.indexOf(blockchain.toLowerCase());
  return index === -1 ? order.length : index;
}
