import { ASSETS, type AssetSymbol } from "@/lib/config/assets";
import { env } from "@/lib/config/env";

export interface IntentsAssetSupport {
  symbol: AssetSymbol;
  networks: string[];
  live: boolean;
}

export interface IntentsQuoteRequest {
  from: AssetSymbol;
  to: AssetSymbol;
  amount: string;
  recipient?: string;
}

export interface IntentsQuote {
  id: string;
  from: AssetSymbol;
  to: AssetSymbol;
  amountIn: string;
  amountOut: string;
  expiresAt: string;
  simulated: boolean;
}

/**
 * NEAR Intents integration boundary.
 *
 * Nearvora uses its own simulated quote provider until an official Intents
 * solver/API configuration is supplied. We do not guess endpoints, contract
 * addresses or SDK methods. Cross-chain capability is therefore reported as
 * unavailable rather than fabricated.
 */
export interface NearIntentsAdapter {
  readonly name: string;
  readonly mode: "demo" | "live";
  getSupportedAssets(): IntentsAssetSupport[];
  isConfigured(): boolean;
  getQuote(request: IntentsQuoteRequest): Promise<IntentsQuote>;
}

class DemoNearIntentsAdapter implements NearIntentsAdapter {
  readonly name = "NEAR Intents (demo boundary)";
  readonly mode = "demo" as const;

  getSupportedAssets(): IntentsAssetSupport[] {
    return (Object.keys(ASSETS) as AssetSymbol[])
      .filter((symbol) => symbol !== "NGN")
      .map((symbol) => ({
        symbol,
        networks: ASSETS[symbol].networks.map((network) => network.name),
        live: false,
      }));
  }

  isConfigured(): boolean {
    return false;
  }

  async getQuote(): Promise<IntentsQuote> {
    throw new Error(
      "NEAR Intents live quoting is not configured. Nearvora is using its clearly labelled simulated quote provider.",
    );
  }
}

export function getNearIntentsAdapter(): NearIntentsAdapter {
  if (env.near.intentsApiUrl) {
    // A live adapter is intentionally omitted until the official API contract
    // is verified. Falling back keeps demo behaviour honest.
    console.warn(
      "[nearvora] NEAR_INTENTS_API_URL is set but no verified live adapter is implemented.",
    );
  }
  return new DemoNearIntentsAdapter();
}
