import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OneClickApiError,
  OneClickClient,
  type OneClickQuoteResponse,
} from "@/lib/services/intents/oneclick-client";
import { resolveAssetId } from "@/lib/services/intents/asset-map";
import { getNearIntentsAdapter } from "@/lib/services/intents";

const TOKENS = [
  {
    assetId: "nep141:usdt.tether-token.near",
    decimals: 6,
    blockchain: "near",
    symbol: "USDT",
    price: 1,
    priceUpdatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    assetId: "nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near",
    decimals: 6,
    blockchain: "eth",
    symbol: "USDT",
    price: 1,
    priceUpdatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    assetId: "nep141:btc.omft.near",
    decimals: 8,
    blockchain: "near",
    symbol: "BTC",
    price: 66000,
    priceUpdatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const QUOTE_RESPONSE: OneClickQuoteResponse = {
  correlationId: "corr_123",
  timestamp: "2026-01-01T00:00:00.000Z",
  signature: "signed-quote",
  quoteRequest: { dry: false },
  quote: {
    depositAddress: "0xdeposit",
    depositMemo: "memo-1",
    amountIn: "1000000",
    amountInFormatted: "1",
    minAmountIn: "1000000",
    amountOut: "990000",
    amountOutFormatted: "0.99",
    minAmountOut: "980000",
    timeEstimate: 120,
    deadline: "2026-01-01T00:15:00.000Z",
  },
};

const savedEnv = {
  key: process.env.NEAR_INTENTS_API_KEY,
  recipient: process.env.NEAR_INTENTS_RECIPIENT,
  refund: process.env.NEAR_INTENTS_REFUND_TO,
  assetMap: process.env.NEAR_INTENTS_ASSET_MAP,
  allowUnauthenticated: process.env.NEAR_INTENTS_ALLOW_UNAUTHENTICATED,
};

beforeEach(() => {
  process.env.NEAR_INTENTS_API_KEY = "test-partner-jwt";
  process.env.NEAR_INTENTS_RECIPIENT = "nearvora.near";
  process.env.NEAR_INTENTS_REFUND_TO = "nearvora.near";
});

afterEach(() => {
  vi.unstubAllGlobals();
  restore("NEAR_INTENTS_API_KEY", savedEnv.key);
  restore("NEAR_INTENTS_RECIPIENT", savedEnv.recipient);
  restore("NEAR_INTENTS_REFUND_TO", savedEnv.refund);
  restore("NEAR_INTENTS_ASSET_MAP", savedEnv.assetMap);
  restore("NEAR_INTENTS_ALLOW_UNAUTHENTICATED", savedEnv.allowUnauthenticated);
});

describe("1Click client", () => {
  it("sends the partner key and maps a quote response", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("X-API-Key")).toBe("test-partner-jwt");
      const body = JSON.parse(String(init?.body));
      expect(body.originAsset).toBe("nep141:usdt.tether-token.near");
      expect(body.destinationAsset).toBe("nep141:btc.omft.near");
      expect(body.amount).toBe("1000000");
      return jsonResponse(QUOTE_RESPONSE);
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new OneClickClient({
      baseUrl: "https://1click.example/v0/",
      apiKey: "test-partner-jwt",
      timeoutMs: 1000,
    });
    const result = await client.getQuote({
      dry: false,
      swapType: "EXACT_INPUT",
      slippageTolerance: 100,
      originAsset: "nep141:usdt.tether-token.near",
      depositType: "INTENTS",
      destinationAsset: "nep141:btc.omft.near",
      amount: "1000000",
      refundTo: "nearvora.near",
      refundType: "INTENTS",
      recipient: "nearvora.near",
      recipientType: "INTENTS",
      deadline: "2026-01-01T00:10:00.000Z",
    });

    expect(result.correlationId).toBe("corr_123");
    expect(result.quote.depositAddress).toBe("0xdeposit");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://1click.example/v0/quote");
  });

  it("passes the deposit memo to the status endpoint", async () => {
    const quoteResponse = {
      timestamp: QUOTE_RESPONSE.timestamp,
      signature: QUOTE_RESPONSE.signature,
      quoteRequest: QUOTE_RESPONSE.quoteRequest,
      quote: QUOTE_RESPONSE.quote,
    };
    const status = {
      correlationId: "corr_123",
      quoteResponse,
      status: "SUCCESS",
      updatedAt: "2026-01-01T00:02:00.000Z",
      swapDetails: {
        depositedAmount: null,
        depositedAmountUsd: null,
        depositedAmountFormatted: null,
        intentHashes: ["intent_1"],
        nearTxHashes: ["near_tx"],
        amountIn: null,
        amountInFormatted: null,
        amountInUsd: null,
        amountOut: null,
        amountOutFormatted: null,
        amountOutUsd: null,
        slippage: null,
        refundedAmount: "0",
        refundedAmountFormatted: "0",
        refundedAmountUsd: "0",
        refundReason: null,
        refundFee: "300000",
        withdrawFee: "300000",
        originChainTxHashes: [{ hash: "0xabc", explorerUrl: "https://explorer/tx/0xabc" }],
        destinationChainTxHashes: [],
      },
    };
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      expect(String(input)).toBe(
        "https://1click.example/v0/status?depositAddress=0xdeposit&depositMemo=memo-1",
      );
      return jsonResponse(status);
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new OneClickClient({
      baseUrl: "https://1click.example/v0",
      apiKey: "test-partner-jwt",
      timeoutMs: 1000,
    });
    const result = await client.getStatus("0xdeposit", "memo-1");

    expect(result.status).toBe("SUCCESS");
    expect(result.swapDetails.originChainTxHashes).toHaveLength(1);
  });

  it("surfaces the 1Click error message without leaking the key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ message: "invalid origin asset" }, 400)),
    );

    const client = new OneClickClient({
      baseUrl: "https://1click.example/v0",
      apiKey: "super-secret",
      timeoutMs: 1000,
    });

    await expect(
      client.getQuote({
        dry: true,
        swapType: "EXACT_INPUT",
        slippageTolerance: 100,
        originAsset: "bad",
        depositType: "ORIGIN_CHAIN",
        destinationAsset: "bad",
        amount: "1",
        refundTo: "refund",
        refundType: "ORIGIN_CHAIN",
        recipient: "recipient",
        recipientType: "DESTINATION_CHAIN",
        deadline: "2026-01-01T00:10:00.000Z",
      }),
    ).rejects.toMatchObject({
      code: "INTENTS_API_ERROR",
      status: 400,
      message: "invalid origin asset",
    });
    await expect(
      client.getStatus("0xdeposit"),
    ).rejects.not.toThrow(/super-secret/);
  });
});

describe("1Click asset resolution", () => {
  it("chooses the preferred chain deterministically and honours overrides", () => {
    expect(resolveAssetId("USDT", TOKENS)).toBe("nep141:usdt.tether-token.near");
    expect(resolveAssetId("USDT", TOKENS, { USDT: "custom:usdt" })).toBe("custom:usdt");
    expect(resolveAssetId("BTC", TOKENS)).toBe("nep141:btc.omft.near");
  });

  it("rejects Naira and unknown assets", () => {
    expect(() => resolveAssetId("NGN", TOKENS)).toThrow(/payment provider/i);
    expect(() => resolveAssetId("SOL", TOKENS)).toThrow(/no supported 1Click token/i);
  });
});

describe("1Click adapter", () => {
  it("returns a live quote using the configured recipient and refund account", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.endsWith("/tokens")) return jsonResponse(TOKENS);
        if (url.endsWith("/quote")) return jsonResponse(QUOTE_RESPONSE);
        throw new Error(`unexpected URL ${url}`);
      }),
    );

    const adapter = getNearIntentsAdapter();
    expect(adapter.mode).toBe("live");
    expect(adapter.isConfigured()).toBe(true);

    const quote = await adapter.getQuote({
      from: "USDT",
      to: "BTC",
      amount: "1000000",
    });

    expect(quote.simulated).toBe(false);
    expect(quote.id).toBe("corr_123");
    expect(quote.depositAddress).toBe("0xdeposit");
    expect(quote.amountIn).toBe("1000000");
    expect(quote.amountOut).toBe("990000");
    expect(quote.rate).toBe("0.009900000000000000");
  });

  it("rejects Naira before contacting 1Click", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const adapter = getNearIntentsAdapter();

    await expect(
      adapter.getQuote({ from: "NGN", to: "USDT", amount: "100000" }),
    ).rejects.toMatchObject({ code: "INTENTS_FIAT_UNSUPPORTED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function restore(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("OneClickApiError", () => {
  it("is an Error with a status and code", () => {
    const error = new OneClickApiError(400, "INTENTS_API_ERROR", "bad request");
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(400);
    expect(error.code).toBe("INTENTS_API_ERROR");
  });
});
