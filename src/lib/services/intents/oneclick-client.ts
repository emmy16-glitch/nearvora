import { z } from "zod";

export type OneClickDepositType = "ORIGIN_CHAIN" | "INTENTS" | "CONFIDENTIAL_INTENTS";
export type OneClickRecipientType = "DESTINATION_CHAIN" | "INTENTS" | "CONFIDENTIAL_INTENTS";
export type OneClickRefundType = OneClickDepositType;
export type OneClickSwapType = "EXACT_INPUT" | "EXACT_OUTPUT" | "FLEX_INPUT" | "ANY_INPUT";

export interface OneClickQuoteRequest {
  dry: boolean;
  swapType: OneClickSwapType;
  slippageTolerance: number;
  originAsset: string;
  depositType: OneClickDepositType;
  destinationAsset: string;
  amount: string;
  refundTo: string;
  refundType: OneClickRefundType;
  recipient: string;
  recipientType: OneClickRecipientType;
  deadline: string;
  referral?: string;
  confidentiality?: "public" | "basic" | "advanced";
}

export interface OneClickToken {
  assetId: string;
  decimals: number;
  blockchain: string;
  symbol: string;
  price?: number | null;
  priceUpdatedAt?: string | null;
  contractAddress?: string | null;
}

export interface OneClickQuote {
  depositAddress?: string;
  depositMemo?: string;
  amountIn: string;
  amountInFormatted?: string;
  amountInUsd?: string;
  minAmountIn?: string;
  amountOut: string;
  amountOutFormatted?: string;
  amountOutUsd?: string;
  minAmountOut?: string;
  deadline?: string;
  timeWhenInactive?: string;
  timeEstimate?: number;
  refundFee?: string;
  withdrawFee?: string;
}

export interface OneClickQuoteResponse {
  correlationId: string;
  timestamp: string;
  signature: string;
  quoteRequest: Record<string, unknown>;
  quote: OneClickQuote;
}

export type OneClickStatus =
  | "KNOWN_DEPOSIT_TX"
  | "PENDING_DEPOSIT"
  | "INCOMPLETE_DEPOSIT"
  | "PROCESSING"
  | "SUCCESS"
  | "REFUNDED"
  | "FAILED";

export interface OneClickSwapDetails {
  intentHashes: string[];
  nearTxHashes: string[];
  originChainTxHashes: { hash: string; explorerUrl: string }[];
  destinationChainTxHashes: { hash: string; explorerUrl: string }[];
  amountIn?: string;
  amountOut?: string;
  refundedAmount?: string;
  refundReason?: string;
  depositedAmount?: string;
  withdrawFee?: string;
}

export interface OneClickStatusResponse {
  correlationId: string;
  quoteResponse: OneClickQuoteResponse;
  status: OneClickStatus;
  updatedAt: string;
  swapDetails: OneClickSwapDetails;
}

export interface OneClickConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
}

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export class OneClickApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "OneClickApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const tokenSchema = z
  .object({
    assetId: z.string().min(1),
    decimals: z.number().int().nonnegative(),
    blockchain: z.string().min(1),
    symbol: z.string().min(1),
    price: z.number().nullable().optional(),
    priceUpdatedAt: z.string().nullable().optional(),
    contractAddress: z.string().nullable().optional(),
  })
  .passthrough();

const quoteSchema = z
  .object({
    depositAddress: z.string().min(1).optional(),
    depositMemo: z.string().optional(),
    amountIn: z.string().min(1),
    amountInFormatted: z.string().optional(),
    amountInUsd: z.string().optional(),
    minAmountIn: z.string().optional(),
    amountOut: z.string().min(1),
    amountOutFormatted: z.string().optional(),
    amountOutUsd: z.string().optional(),
    minAmountOut: z.string().optional(),
    deadline: z.string().optional(),
    timeWhenInactive: z.string().optional(),
    timeEstimate: z.number().optional(),
    refundFee: z.string().optional(),
    withdrawFee: z.string().optional(),
  })
  .passthrough();

const quoteResponseSchema = z
  .object({
    correlationId: z.string().min(1),
    timestamp: z.string().min(1),
    signature: z.string().min(1),
    quoteRequest: z.record(z.string(), z.unknown()),
    quote: quoteSchema,
  })
  .passthrough();

const transactionDetailsSchema = z
  .object({
    hash: z.string(),
    explorerUrl: z.string(),
  })
  .passthrough();

const swapDetailsSchema = z
  .object({
    intentHashes: z.array(z.string()).default([]),
    nearTxHashes: z.array(z.string()).default([]),
    originChainTxHashes: z.array(transactionDetailsSchema).default([]),
    destinationChainTxHashes: z.array(transactionDetailsSchema).default([]),
    amountIn: z.string().optional(),
    amountOut: z.string().optional(),
    refundedAmount: z.string().optional(),
    refundReason: z.string().optional(),
    depositedAmount: z.string().optional(),
    withdrawFee: z.string().optional(),
  })
  .passthrough();

const statusResponseSchema = z
  .object({
    correlationId: z.string().min(1),
    quoteResponse: quoteResponseSchema,
    status: z.enum([
      "KNOWN_DEPOSIT_TX",
      "PENDING_DEPOSIT",
      "INCOMPLETE_DEPOSIT",
      "PROCESSING",
      "SUCCESS",
      "REFUNDED",
      "FAILED",
    ]),
    updatedAt: z.string().min(1),
    swapDetails: swapDetailsSchema,
  })
  .passthrough();

export class OneClickClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(config: OneClickConfig, fetchImpl: FetchLike = fetch) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey?.trim() || undefined;
    this.timeoutMs = config.timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async getTokens(): Promise<OneClickToken[]> {
    return this.request("/tokens", z.array(tokenSchema));
  }

  async getQuote(request: OneClickQuoteRequest): Promise<OneClickQuoteResponse> {
    return this.request("/quote", quoteResponseSchema, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getStatus(depositAddress: string, depositMemo?: string): Promise<OneClickStatusResponse> {
    if (!depositAddress.trim()) {
      throw new OneClickApiError(
        422,
        "INTENTS_DEPOSIT_ADDRESS_REQUIRED",
        "A 1Click deposit address is required to check swap status.",
      );
    }
    const params = new URLSearchParams({ depositAddress });
    if (depositMemo) params.set("depositMemo", depositMemo);
    return this.request(`/status?${params.toString()}`, statusResponseSchema);
  }

  async submitDeposit(depositAddress: string, txHash: string): Promise<void> {
    if (!depositAddress.trim() || !txHash.trim()) {
      throw new OneClickApiError(
        422,
        "INTENTS_DEPOSIT_DETAILS_REQUIRED",
        "Both the deposit address and transaction hash are required.",
      );
    }
    await this.request(
      "/deposit/submit",
      z.unknown(),
      {
        method: "POST",
        body: JSON.stringify({ depositAddress, txHash }),
      },
      true,
    );
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    init: RequestInit = {},
    allowEmptyBody = false,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body !== undefined) headers.set("Content-Type", "application/json");
    if (this.apiKey) headers.set("X-API-Key", this.apiKey);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
        cache: "no-store",
      });
      const text = await response.text();

      if (!response.ok) {
        throw new OneClickApiError(
          response.status,
          "INTENTS_API_ERROR",
          extractErrorMessage(text, response.status),
        );
      }

      if (!text) {
        if (allowEmptyBody) return undefined as T;
        throw new OneClickApiError(
          502,
          "INTENTS_INVALID_RESPONSE",
          "The 1Click API returned an empty response.",
        );
      }

      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new OneClickApiError(
          502,
          "INTENTS_INVALID_RESPONSE",
          "The 1Click API returned a response that was not valid JSON.",
        );
      }

      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        throw new OneClickApiError(
          502,
          "INTENTS_INVALID_RESPONSE",
          "The 1Click API response did not match the expected schema.",
        );
      }
      return parsed.data;
    } catch (error) {
      if (error instanceof OneClickApiError) throw error;
      if (controller.signal.aborted) {
        throw new OneClickApiError(
          504,
          "INTENTS_TIMEOUT",
          "The 1Click API did not respond before the request timeout.",
        );
      }
      throw new OneClickApiError(
        502,
        "INTENTS_UNAVAILABLE",
        "The 1Click API could not be reached.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

function extractErrorMessage(text: string, status: number): string {
  if (text) {
    try {
      const payload = JSON.parse(text) as { message?: unknown; error?: unknown };
      if (typeof payload.message === "string" && payload.message.trim()) {
        return payload.message;
      }
      if (typeof payload.error === "string" && payload.error.trim()) {
        return payload.error;
      }
    } catch {
      if (text.length <= 300) return text;
    }
  }
  return `The 1Click API rejected the request (HTTP ${status}).`;
}
