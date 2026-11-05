import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStore } from "@/lib/database/store";
import { DEMO_USER } from "@/lib/database/seed-data";
import {
  createLiveSwap,
  refreshLiveSwap,
  submitLiveSwapDeposit,
} from "@/lib/services/intents/live-swap-service";
import type { OneClickQuoteResponse, OneClickStatus } from "@/lib/services/intents/oneclick-client";

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
    assetId: "nep141:btc.omft.near",
    decimals: 8,
    blockchain: "near",
    symbol: "BTC",
    price: 66000,
    priceUpdatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    assetId: "nep141:bsc-usdc.omft.near",
    decimals: 18,
    blockchain: "bsc",
    symbol: "USDC",
    price: 1,
    priceUpdatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const QUOTE: OneClickQuoteResponse = {
  correlationId: "corr_live_1",
  timestamp: "2026-01-01T00:00:00.000Z",
  signature: "signed-live-quote",
  quoteRequest: { dry: false },
  quote: {
    depositAddress: "0xlive-deposit",
    amountIn: "1000000",
    amountInFormatted: "1",
    minAmountIn: "1000000",
    amountOut: "990000",
    amountOutFormatted: "0.0099",
    minAmountOut: "980000",
    timeEstimate: 120,
    deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  },
};

const savedEnv = {
  key: process.env.NEAR_INTENTS_API_KEY,
  allow: process.env.NEAR_INTENTS_ALLOW_UNAUTHENTICATED,
  demo: process.env.DEMO_MODE,
};

beforeEach(() => {
  process.env.NEAR_INTENTS_API_KEY = "test-partner-jwt";
  delete process.env.NEAR_INTENTS_ALLOW_UNAUTHENTICATED;
  process.env.DEMO_MODE = "true";
  getStore().seed();
});

afterEach(() => {
  vi.unstubAllGlobals();
  restore("NEAR_INTENTS_API_KEY", savedEnv.key);
  restore("NEAR_INTENTS_ALLOW_UNAUTHENTICATED", savedEnv.allow);
  restore("DEMO_MODE", savedEnv.demo);
});

describe("live 1Click swaps", () => {
  it("creates a real swap record from a 1Click quote", async () => {
    vi.stubGlobal("fetch", mockFetch({ status: "PENDING_DEPOSIT" }));

    const swap = await createLiveSwap(DEMO_USER.id, {
      from: "USDT",
      to: "BTC",
      amount: "1",
      recipient: "bc1qdestination",
      refundTo: "0xrefund",
    });

    expect(swap.status).toBe("PENDING_DEPOSIT");
    expect(swap.depositAddress).toBe("0xlive-deposit");
    expect(swap.amountIn).toBe("1000000");
    expect(swap.amountOut).toBe("990000");
    expect(swap.signature).toBe("signed-live-quote");
    expect(swap.simulated).toBe(false);
    expect(getStore().listLiveSwaps(DEMO_USER.id)).toHaveLength(1);
  });

  it("uses the selected token asset id and token decimals", async () => {
    let quoteBody: Record<string, unknown> = {};
    vi.stubGlobal(
      "fetch",
      mockFetch({
        status: "PENDING_DEPOSIT",
        onQuote: (body) => {
          quoteBody = body;
        },
      }),
    );

    await createLiveSwap(DEMO_USER.id, {
      from: "USDC",
      to: "BTC",
      amount: "1",
      originAssetId: "nep141:bsc-usdc.omft.near",
      destinationAssetId: "nep141:btc.omft.near",
      recipient: "bc1qdestination",
      refundTo: "0xrefund",
    });

    expect(quoteBody.originAsset).toBe("nep141:bsc-usdc.omft.near");
    expect(quoteBody.destinationAsset).toBe("nep141:btc.omft.near");
    expect(quoteBody.amount).toBe("1000000000000000000");
  });

  it("submits the deposit hash and tracks the swap to settlement", async () => {
    let status: OneClickStatus = "PROCESSING";
    vi.stubGlobal("fetch", mockFetch({ getStatus: () => status }));

    const swap = await createLiveSwap(DEMO_USER.id, {
      from: "USDT",
      to: "BTC",
      amount: "1",
      recipient: "bc1qdestination",
      refundTo: "0xrefund",
    });

    const updated = await submitLiveSwapDeposit(DEMO_USER.id, swap.id, "0xdeposittx");
    expect(updated.txHash).toBe("0xdeposittx");
    expect(updated.status).toBe("PROCESSING");

    status = "SUCCESS";
    const settled = await refreshLiveSwap(DEMO_USER.id, swap.id);
    expect(settled.status).toBe("SUCCESS");
    expect(settled.amountOut).toBe("995000");
    expect(settled.transactionId).toBeTruthy();

    const transactions = getStore()
      .listTransactions(DEMO_USER.id)
      .filter((transaction) => transaction.note?.startsWith("live_swap:"));
    expect(transactions).toHaveLength(1);
    expect(transactions[0].simulated).toBe(false);
    expect(transactions[0].status).toBe("completed");
  });

  it("rejects Naira and missing addresses before calling 1Click", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createLiveSwap(DEMO_USER.id, {
        from: "NGN",
        to: "USDT",
        amount: "100",
        recipient: "0xdestination",
        refundTo: "0xrefund",
      }),
    ).rejects.toMatchObject({ code: "INTENTS_FIAT_UNSUPPORTED" });

    await expect(
      createLiveSwap(DEMO_USER.id, {
        from: "USDT",
        to: "BTC",
        amount: "1",
        recipient: "",
        refundTo: "",
      }),
    ).rejects.toMatchObject({ code: "INTENTS_ADDRESS_REQUIRED" });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function mockFetch(options: {
  status?: OneClickStatus;
  getStatus?: () => OneClickStatus;
  onQuote?: (body: Record<string, unknown>) => void;
}) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/tokens")) return jsonResponse(TOKENS);
    if (url.endsWith("/quote")) {
      options.onQuote?.(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return jsonResponse(QUOTE);
    }
    if (url.includes("/status?")) {
      const status = options.getStatus?.() ?? options.status ?? "PENDING_DEPOSIT";
      return jsonResponse({
        correlationId: QUOTE.correlationId,
        quoteResponse: QUOTE,
        status,
        updatedAt: new Date().toISOString(),
        swapDetails: {
          intentHashes: ["intent_1"],
          nearTxHashes: ["near_tx"],
          originChainTxHashes: [],
          destinationChainTxHashes: [],
          amountOut: status === "SUCCESS" ? "995000" : undefined,
        },
      });
    }
    if (url.endsWith("/deposit/submit")) return jsonResponse({});
    throw new Error(`unexpected URL ${url}`);
  });
}

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
