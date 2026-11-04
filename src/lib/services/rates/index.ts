import { env } from "@/lib/config/env";
import { ApiError } from "@/lib/api/handler";
import {
  ASSETS,
  CRYPTO_SYMBOLS,
  DEMO_CHANGE_PERCENT,
  DEMO_NGN_RATES,
  type AssetSymbol,
} from "@/lib/config/assets";

export interface RateView {
  symbol: AssetSymbol;
  name: string;
  rateNgn: string;
  changePercent: number;
  network: string;
  color: string;
}

export interface RatesSnapshot {
  rates: RateView[];
  updatedAt: string;
  source: string;
  simulated: boolean;
}

/**
 * Static demonstration rates. A live provider adapter can replace this
 * function without changing the UI contract. Values are never presented as
 * live market data.
 */
export function getRates(): RatesSnapshot {
  if (!env.demoMode) {
    throw new ApiError(
      503,
      "LIVE_RATES_DISABLED",
      "No live market-rate provider is configured. Nearvora will not serve simulated rates as live market data.",
    );
  }
  const rates = CRYPTO_SYMBOLS.map((symbol) => ({
    symbol,
    name: ASSETS[symbol].name,
    rateNgn: DEMO_NGN_RATES[symbol],
    changePercent: DEMO_CHANGE_PERCENT[symbol],
    network: ASSETS[symbol].networks[0]?.name ?? "Demo network",
    color: ASSETS[symbol].color,
  }));

  return {
    rates,
    updatedAt: new Date().toISOString(),
    source: "Simulated demonstration feed",
    simulated: true,
  };
}
