import Decimal from "decimal.js";
import { ASSETS, type AssetSymbol } from "@/lib/config/assets";
import { env } from "@/lib/config/env";
import { resolveAssetId } from "./asset-map";
import {
  OneClickApiError,
  OneClickClient,
  type OneClickDepositType,
  type OneClickQuote,
  type OneClickQuoteResponse,
  type OneClickRecipientType,
  type OneClickRefundType,
  type OneClickStatusResponse,
  type OneClickSwapType,
  type OneClickToken,
} from "./oneclick-client";

export interface IntentsAssetSupport {
  symbol: AssetSymbol;
  networks: string[];
  live: boolean;
}

export interface IntentsQuoteRequest {
  from: AssetSymbol;
  to: AssetSymbol;
  /** Amount in the smallest unit of the source asset. */
  amount: string;
  recipient?: string;
  recipientType?: OneClickRecipientType;
  refundTo?: string;
  refundType?: OneClickRefundType;
  depositType?: OneClickDepositType;
  swapType?: OneClickSwapType;
  slippageBps?: number;
  deadline?: string;
  dry?: boolean;
}

export interface IntentsQuote {
  id: string;
  from: AssetSymbol;
  to: AssetSymbol;
  amountIn: string;
  amountOut: string;
  minAmountOut?: string;
  rate: string;
  expiresAt: string;
  depositAddress?: string;
  depositMemo?: string;
  timeEstimate?: number;
  signature: string;
  simulated: boolean;
  raw: OneClickQuoteResponse;
}

export class IntentsError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "IntentsError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * NEAR Intents integration boundary.
 *
 * The live adapter talks to the official 1Click Swap API. Nearvora still runs
 * with simulated quotes in demo mode; LIVE runtime execution remains disabled
 * until custody, signing and settlement reconciliation exist.
 */
export interface NearIntentsAdapter {
  readonly name: string;
  readonly mode: "demo" | "live";
  getSupportedAssets(): IntentsAssetSupport[];
  isConfigured(): boolean;
  getQuote(request: IntentsQuoteRequest): Promise<IntentsQuote>;
  getStatus(depositAddress: string, depositMemo?: string): Promise<OneClickStatusResponse>;
  submitDeposit(depositAddress: string, txHash: string): Promise<void>;
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
    throw new IntentsError(
      503,
      "INTENTS_NOT_CONFIGURED",
      "NEAR Intents live quoting is not configured. Nearvora is using its clearly labelled simulated quote provider.",
    );
  }

  async getStatus(): Promise<OneClickStatusResponse> {
    throw new IntentsError(
      503,
      "INTENTS_NOT_CONFIGURED",
      "NEAR Intents status tracking requires a configured 1Click API key.",
    );
  }

  async submitDeposit(): Promise<void> {
    throw new IntentsError(
      503,
      "INTENTS_NOT_CONFIGURED",
      "NEAR Intents deposit submission requires a configured 1Click API key.",
    );
  }
}

interface TokenCache {
  expiresAt: number;
  tokens: OneClickToken[];
}

const TOKEN_CACHE_MS = 5 * 60 * 1000;
const DEFAULT_DEADLINE_MS = 10 * 60 * 1000;

export class OneClickNearIntentsAdapter implements NearIntentsAdapter {
  readonly name: string = "NEAR Intents (1Click)";
  readonly mode = "live" as const;
  private readonly client: OneClickClient;
  private tokenCache: TokenCache | null = null;

  constructor(client?: OneClickClient) {
    this.client =
      client ??
      new OneClickClient({
        baseUrl: env.near.intentsApiUrl,
        apiKey: env.near.intentsApiKey || undefined,
        timeoutMs: env.near.intentsTimeoutMs,
      });
  }

  getSupportedAssets(): IntentsAssetSupport[] {
    return (Object.keys(ASSETS) as AssetSymbol[])
      .filter((symbol) => symbol !== "NGN")
      .map((symbol) => ({
        symbol,
        networks: ASSETS[symbol].networks.map((network) => network.name),
        live: this.isConfigured(),
      }));
  }

  isConfigured(): boolean {
    if (!env.near.intentsApiKey && !env.near.intentsAllowUnauthenticated) return false;
    try {
      const url = new URL(env.near.intentsApiUrl);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }

  async getSupportedTokens(): Promise<OneClickToken[]> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.tokens;
    }
    const tokens = await this.call(() => this.client.getTokens());
    this.tokenCache = { expiresAt: Date.now() + TOKEN_CACHE_MS, tokens };
    return tokens;
  }

  async getQuote(request: IntentsQuoteRequest): Promise<IntentsQuote> {
    this.assertConfigured();

    const { from, to } = request;
    if (from === to) {
      throw new IntentsError(422, "SAME_ASSET", "Choose two different assets to convert.");
    }
    if (!/^\d+$/.test(request.amount) || request.amount === "0") {
      throw new IntentsError(
        422,
        "INVALID_AMOUNT",
        "1Click amounts must be a positive integer in the asset's smallest unit.",
      );
    }
    if (from === "NGN" || to === "NGN") {
      throw new IntentsError(
        422,
        "INTENTS_FIAT_UNSUPPORTED",
        "NEAR Intents does not settle Naira directly. Convert Naira through the payment provider first.",
      );
    }

    const tokens = await this.getSupportedTokens();
    const originAsset = this.resolveToken(from, tokens);
    const destinationAsset = this.resolveToken(to, tokens);

    const recipient = request.recipient?.trim() || env.near.intentsRecipient;
    if (!recipient) {
      throw new IntentsError(
        503,
        "INTENTS_RECIPIENT_REQUIRED",
        "Configure NEAR_INTENTS_RECIPIENT or provide a recipient address for the 1Click quote.",
      );
    }
    const refundTo = request.refundTo?.trim() || env.near.intentsRefundTo || recipient;

    // Treat caller-supplied refund addresses as origin-chain addresses. Without
    // one, use the configured Intents account so the refund type always matches
    // the address format we actually have.
    const depositType = request.depositType ?? (request.refundTo ? "ORIGIN_CHAIN" : "INTENTS");
    const recipientType =
      request.recipientType ?? (request.recipient ? "DESTINATION_CHAIN" : "INTENTS");
    const refundType = request.refundType ?? (request.refundTo ? "ORIGIN_CHAIN" : "INTENTS");
    const deadline = request.deadline ?? new Date(Date.now() + DEFAULT_DEADLINE_MS).toISOString();

    const response = await this.call(() =>
      this.client.getQuote({
        dry: request.dry ?? false,
        swapType: request.swapType ?? "EXACT_INPUT",
        slippageTolerance: request.slippageBps ?? env.near.intentsSlippageBps,
        originAsset,
        depositType,
        destinationAsset,
        amount: request.amount,
        refundTo,
        refundType,
        recipient,
        recipientType,
        deadline,
        referral: env.near.intentsReferral || undefined,
      }),
    );

    return toIntentsQuote(from, to, response);
  }

  async getStatus(depositAddress: string, depositMemo?: string): Promise<OneClickStatusResponse> {
    this.assertConfigured();
    return this.call(() => this.client.getStatus(depositAddress, depositMemo));
  }

  async submitDeposit(depositAddress: string, txHash: string): Promise<void> {
    this.assertConfigured();
    await this.call(() => this.client.submitDeposit(depositAddress, txHash));
  }

  private resolveToken(symbol: AssetSymbol, tokens: OneClickToken[]): string {
    try {
      return resolveAssetId(symbol, tokens, env.near.intentsAssetMap);
    } catch (error) {
      throw new IntentsError(
        422,
        "INTENTS_ASSET_UNAVAILABLE",
        error instanceof Error ? error.message : `1Click cannot quote ${symbol}.`,
      );
    }
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new IntentsError(
        503,
        "INTENTS_NOT_CONFIGURED",
        "NEAR Intents live quoting is not configured. Set NEAR_INTENTS_API_KEY and try again.",
      );
    }
  }

  private async call<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof OneClickApiError) {
        throw new IntentsError(error.status, error.code, error.message, error.details);
      }
      throw error;
    }
  }
}

class UnconfiguredLiveNearIntentsAdapter extends OneClickNearIntentsAdapter {
  readonly name = "NEAR Intents (unconfigured live adapter)";

  override isConfigured(): boolean {
    return false;
  }

  override async getQuote(): Promise<IntentsQuote> {
    throw new IntentsError(
      503,
      "INTENTS_NOT_CONFIGURED",
      "NEAR Intents live quoting is not configured. Refusing to return a simulated quote in LIVE mode.",
    );
  }
}

function toIntentsQuote(
  from: AssetSymbol,
  to: AssetSymbol,
  response: OneClickQuoteResponse,
): IntentsQuote {
  const quote: OneClickQuote = response.quote;
  const now = Date.now();
  return {
    id: response.correlationId,
    from,
    to,
    amountIn: quote.amountIn,
    amountOut: quote.amountOut,
    minAmountOut: quote.minAmountOut,
    rate: deriveRate(quote, ASSETS[from].decimals, ASSETS[to].decimals),
    expiresAt: quote.deadline ?? new Date(now + DEFAULT_DEADLINE_MS).toISOString(),
    depositAddress: quote.depositAddress,
    depositMemo: quote.depositMemo,
    timeEstimate: quote.timeEstimate,
    signature: response.signature,
    simulated: false,
    raw: response,
  };
}

function deriveRate(quote: OneClickQuote, fromDecimals: number, toDecimals: number): string {
  const amountIn = new Decimal(quote.amountIn);
  if (amountIn.lte(0)) return "0";
  return new Decimal(quote.amountOut)
    .div(new Decimal(10).pow(toDecimals))
    .div(new Decimal(quote.amountIn).div(new Decimal(10).pow(fromDecimals)))
    .toFixed(18);
}

export function getNearIntentsAdapter(): NearIntentsAdapter {
  if (env.near.intentsApiKey || env.near.intentsAllowUnauthenticated) {
    const adapter = new OneClickNearIntentsAdapter();
    if (adapter.isConfigured()) return adapter;
  }
  if (!env.demoMode) return new UnconfiguredLiveNearIntentsAdapter();
  return new DemoNearIntentsAdapter();
}
