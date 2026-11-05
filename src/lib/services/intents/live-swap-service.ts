import { env } from "@/lib/config/env";
import { ApiError } from "@/lib/api/handler";
import { ASSETS, type AssetSymbol } from "@/lib/config/assets";
import { createId, createReference, getStore } from "@/lib/database/store";
import { toMinor, type Minor } from "@/lib/money/money";
import { audit } from "@/lib/security/audit";
import type { LiveSwap, LiveSwapStatus, Transaction } from "@/lib/types/domain";
import { getNearIntentsAdapter, IntentsError } from "./index";
import type {
  OneClickDepositType,
  OneClickRecipientType,
  OneClickRefundType,
} from "./oneclick-client";

export interface CreateLiveSwapInput {
  from: AssetSymbol;
  to: AssetSymbol;
  /** Human-readable amount, e.g. "10.5". */
  amount: string;
  originAssetId?: string;
  destinationAssetId?: string;
  recipient: string;
  refundTo: string;
  depositType?: OneClickDepositType;
  recipientType?: OneClickRecipientType;
  refundType?: OneClickRefundType;
  slippageBps?: number;
}

const memorySwaps = new Map<string, LiveSwap>();

function addSwap(swap: LiveSwap): LiveSwap {
  if (env.demoMode) return getStore().addLiveSwap(swap);
  memorySwaps.set(swap.id, swap);
  return structuredClone(swap);
}

function getSwap(id: string): LiveSwap | undefined {
  if (env.demoMode) return getStore().getLiveSwap(id);
  const swap = memorySwaps.get(id);
  return swap ? structuredClone(swap) : undefined;
}

function updateSwap(id: string, update: Partial<LiveSwap>): LiveSwap {
  if (env.demoMode) return getStore().updateLiveSwap(id, update);
  const swap = memorySwaps.get(id);
  if (!swap) throw new Error("Live swap not found");
  Object.assign(swap, update, { updatedAt: new Date().toISOString() });
  return structuredClone(swap);
}

function listSwaps(userId: string, limit = 50): LiveSwap[] {
  if (env.demoMode) return getStore().listLiveSwaps(userId, limit);
  return [...memorySwaps.values()]
    .filter((swap) => swap.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((swap) => structuredClone(swap));
}

export async function createLiveSwap(
  userId: string,
  input: CreateLiveSwapInput,
): Promise<LiveSwap> {
  const adapter = getNearIntentsAdapter();
  if (!adapter.isConfigured() || adapter.mode !== "live") {
    throw new ApiError(
      503,
      "INTENTS_NOT_CONFIGURED",
      "Live 1Click swaps are not configured. Set NEAR_INTENTS_API_KEY first.",
    );
  }
  if (input.from === "NGN" || input.to === "NGN") {
    throw new ApiError(
      422,
      "INTENTS_FIAT_UNSUPPORTED",
      "1Click does not settle Naira directly. Fund a crypto balance first.",
    );
  }
  if (input.from === input.to) {
    throw new ApiError(422, "SAME_ASSET", "Choose two different assets.");
  }

  const recipient = input.recipient.trim();
  const refundTo = input.refundTo.trim();
  if (!recipient || !refundTo) {
    throw new ApiError(
      422,
      "INTENTS_ADDRESS_REQUIRED",
      "A destination address and refund address are required for a live swap.",
    );
  }

  let decimals = ASSETS[input.from].decimals;
  if (input.originAssetId) {
    try {
      const tokens = await adapter.getSupportedTokens();
      const token = tokens.find((item) => item.assetId === input.originAssetId?.trim());
      if (token) decimals = token.decimals;
    } catch (error) {
      throw toApiError(error);
    }
  }

  let amountIn: Minor;
  try {
    amountIn = toMinor(input.amount, decimals);
  } catch {
    throw new ApiError(422, "INVALID_AMOUNT", "Enter a valid amount.");
  }
  if (BigInt(amountIn) <= 0n) {
    throw new ApiError(422, "INVALID_AMOUNT", "Enter an amount greater than zero.");
  }

  let quote;
  try {
    quote = await adapter.getQuote({
      from: input.from,
      to: input.to,
      amount: amountIn,
      originAssetId: input.originAssetId,
      destinationAssetId: input.destinationAssetId,
      recipient,
      refundTo,
      depositType: input.depositType ?? "ORIGIN_CHAIN",
      recipientType: input.recipientType ?? "DESTINATION_CHAIN",
      refundType: input.refundType ?? "ORIGIN_CHAIN",
      slippageBps: input.slippageBps,
    });
  } catch (error) {
    throw toApiError(error);
  }

  if (!quote.depositAddress) {
    throw new ApiError(
      502,
      "INTENTS_NO_DEPOSIT_ADDRESS",
      "1Click returned a quote without a deposit address. Nothing was created.",
    );
  }

  const now = new Date().toISOString();
  const swap: LiveSwap = {
    id: createId("liveswap"),
    userId,
    from: input.from,
    to: input.to,
    amountIn: quote.amountIn,
    amountOut: quote.amountOut,
    minAmountOut: quote.minAmountOut,
    rate: quote.rate,
    recipient,
    refundTo,
    depositAddress: quote.depositAddress,
    depositMemo: quote.depositMemo,
    signature: quote.signature,
    correlationId: quote.id,
    status: "PENDING_DEPOSIT",
    timeEstimate: quote.timeEstimate,
    simulated: false,
    createdAt: now,
    updatedAt: now,
    expiresAt: quote.expiresAt,
  };

  const created = addSwap(swap);
  audit({
    userId,
    action: "live_swap.created",
    entity: "live_swap",
    entityId: created.id,
    metadata: {
      from: created.from,
      to: created.to,
      amountIn: created.amountIn,
      depositAddress: created.depositAddress,
      correlationId: created.correlationId,
      simulated: false,
    },
  });
  return created;
}

export async function refreshLiveSwap(userId: string, id: string): Promise<LiveSwap> {
  const swap = getLiveSwapForUser(userId, id);
  if (isTerminal(swap.status)) return swap;

  const adapter = getNearIntentsAdapter();
  if (!adapter.isConfigured() || adapter.mode !== "live") {
    throw new ApiError(
      503,
      "INTENTS_NOT_CONFIGURED",
      "Live 1Click swaps are not configured. Set NEAR_INTENTS_API_KEY first.",
    );
  }

  let response;
  try {
    response = await adapter.getStatus(swap.depositAddress, swap.depositMemo);
  } catch (error) {
    throw toApiError(error);
  }

  const status = response.status as LiveSwapStatus;
  const details = response.swapDetails;
  const update: Partial<LiveSwap> = {
    status,
    amountOut:
      details.amountOut && /^\d+$/.test(details.amountOut)
        ? details.amountOut
        : swap.amountOut,
    refundedAmount:
      details.refundedAmount && /^\d+$/.test(details.refundedAmount)
        ? details.refundedAmount
        : swap.refundedAmount,
    refundReason: details.refundReason ?? swap.refundReason,
  };

  if (status === "SUCCESS" && !swap.transactionId) {
    const transaction = recordSettlement(swap, update.amountOut ?? swap.amountOut);
    update.transactionId = transaction.id;
  }

  return updateSwap(swap.id, update);
}

export async function submitLiveSwapDeposit(
  userId: string,
  id: string,
  txHash: string,
): Promise<LiveSwap> {
  const swap = getLiveSwapForUser(userId, id);
  const hash = txHash.trim();
  if (!hash) {
    throw new ApiError(422, "INVALID_TX_HASH", "Enter the deposit transaction hash.");
  }

  const adapter = getNearIntentsAdapter();
  if (!adapter.isConfigured() || adapter.mode !== "live") {
    throw new ApiError(
      503,
      "INTENTS_NOT_CONFIGURED",
      "Live 1Click swaps are not configured. Set NEAR_INTENTS_API_KEY first.",
    );
  }

  try {
    await adapter.submitDeposit(swap.depositAddress, hash);
  } catch (error) {
    throw toApiError(error);
  }

  const updated = updateSwap(swap.id, { txHash: hash });
  try {
    return await refreshLiveSwap(userId, id);
  } catch {
    return updated;
  }
}

export function getLiveSwapForUser(userId: string, id: string): LiveSwap {
  const swap = getSwap(id);
  if (!swap || swap.userId !== userId) {
    throw new ApiError(404, "LIVE_SWAP_NOT_FOUND", "That live swap could not be found.");
  }
  return swap;
}

export function listLiveSwaps(userId: string): LiveSwap[] {
  return listSwaps(userId);
}

function recordSettlement(swap: LiveSwap, amountOut: Minor): Transaction {
  const transaction: Transaction = {
    id: createId("tx"),
    userId: swap.userId,
    reference: createReference(),
    type: "swap",
    status: "completed",
    direction: "neutral",
    title: `1Click ${swap.from} → ${swap.to}`,
    description: `Live cross-chain swap settled on the ${swap.to} destination chain.`,
    asset: swap.from,
    amount: swap.amountIn,
    fee: "0",
    counterparty: "NEAR Intents",
    note: `live_swap:${swap.id}`,
    simulated: false,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
  transaction.note = `live_swap:${swap.id};amountOut:${amountOut}`;
  if (env.demoMode) {
    getStore().addTransaction(transaction);
    getStore().addNotification({
      id: createId("notif"),
      userId: swap.userId,
      title: "Live swap settled",
      body: `${swap.amountIn} ${swap.from} → ${amountOut} ${swap.to} settled through 1Click.`,
      kind: "transaction",
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
  return transaction;
}

function isTerminal(status: LiveSwapStatus): boolean {
  return status === "SUCCESS" || status === "REFUNDED" || status === "FAILED";
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof IntentsError) {
    return new ApiError(error.status, error.code, error.message, error.details);
  }
  if (error instanceof Error) {
    return new ApiError(502, "INTENTS_REQUEST_FAILED", error.message);
  }
  return new ApiError(502, "INTENTS_REQUEST_FAILED", "The 1Click request failed.");
}
