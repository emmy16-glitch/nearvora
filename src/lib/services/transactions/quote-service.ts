import Decimal from "decimal.js";
import { env } from "@/lib/config/env";
import {
  ASSETS,
  DEMO_NGN_RATES,
  type AssetSymbol,
} from "@/lib/config/assets";
import { createId, getStore } from "@/lib/database/store";
import { convertMinor, percentOfMinor, type Minor } from "@/lib/money/money";
import { ApiError } from "@/lib/api/handler";
import type { Quote } from "@/lib/types/domain";

const QUOTE_TTL_MS = 5 * 60 * 1000;
const FEE_BPS = 60;
const SPREAD_BPS = 35;
const CRYPTO_SLIPPAGE_BPS = 25;

export interface QuoteRequest {
  from: AssetSymbol;
  to: AssetSymbol;
  amount: Minor;
  side?: "from" | "to";
}

function isCrypto(symbol: AssetSymbol): boolean {
  return ASSETS[symbol].kind === "crypto";
}

export function referenceRate(from: AssetSymbol, to: AssetSymbol): Decimal {
  return new Decimal(DEMO_NGN_RATES[from]).div(DEMO_NGN_RATES[to]);
}

/**
 * Create a simulated swap quote. This provider is intentionally deterministic
 * and labelled simulated. A NEAR Intents quote adapter can replace it without
 * changing callers.
 */
export function createQuote(userId: string, request: QuoteRequest): Quote {
  if (!env.demoMode) {
    throw new ApiError(
      503,
      "LIVE_QUOTES_DISABLED",
      "Live quotes are not configured. Nearvora will not present a simulated quote as live pricing.",
    );
  }
  const { from, to } = request;
  if (from === to) {
    throw new ApiError(422, "SAME_ASSET", "Choose two different assets to convert.");
  }

  const amount = new Decimal(request.amount);
  if (amount.lte(0)) {
    throw new ApiError(422, "INVALID_AMOUNT", "Enter an amount greater than zero.");
  }

  const rate = referenceRate(from, to).mul(
    new Decimal(1).minus(new Decimal(SPREAD_BPS).div(10_000)),
  );
  if (rate.lte(0)) throw new ApiError(422, "INVALID_RATE", "No demo quote is available.");

  let fromAmount: Minor;
  let fee: Minor;

  if (request.side === "to") {
    const toDecimals = ASSETS[to].decimals;
    const toUnits = new Decimal(request.amount).div(new Decimal(10).pow(toDecimals));
    const grossFromUnits = toUnits.div(rate);
    const grossFromMinor = grossFromUnits
      .mul(new Decimal(10).pow(ASSETS[from].decimals))
      .toDecimalPlaces(0, Decimal.ROUND_UP)
      .toFixed(0);
    fromAmount = new Decimal(grossFromMinor)
      .div(new Decimal(1).minus(new Decimal(FEE_BPS).div(10_000)))
      .toDecimalPlaces(0, Decimal.ROUND_UP)
      .toFixed(0);
    fee = percentOfMinor(fromAmount, FEE_BPS);
  } else {
    fromAmount = request.amount;
    fee = percentOfMinor(fromAmount, FEE_BPS);
  }

  const netSource = new Decimal(fromAmount).minus(fee).toFixed(0);
  const toAmount = convertMinor(
    netSource,
    ASSETS[from].decimals,
    rate.toFixed(18),
    ASSETS[to].decimals,
  );

  if (new Decimal(toAmount).lte(0)) {
    throw new ApiError(422, "AMOUNT_TOO_SMALL", "This amount is too small to quote.");
  }

  const now = Date.now();
  const quote: Quote = {
    id: createId("quote"),
    userId,
    from,
    to,
    fromAmount,
    toAmount,
    rate: rate.toFixed(18),
    fee,
    feeAsset: from,
    spreadBps: SPREAD_BPS,
    slippageBps: isCrypto(from) && isCrypto(to) ? CRYPTO_SLIPPAGE_BPS : 0,
    simulated: true,
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
    createdAt: new Date(now).toISOString(),
  };

  return getStore().addQuote(quote);
}

export function getQuote(id: string): Quote | undefined {
  return getStore().getQuote(id);
}

export function assertQuoteFresh(quote: Quote): void {
  if (new Date(quote.expiresAt).getTime() <= Date.now()) {
    throw new ApiError(
      409,
      "QUOTE_EXPIRED",
      "This quote expired. Refresh the quote and review the updated amounts.",
    );
  }
}
