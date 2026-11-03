import { z } from "zod";
import { ASSETS, type AssetSymbol } from "@/lib/config/assets";
import { getStore } from "@/lib/database/store";
import { formatAmount } from "@/lib/money/format";
import { toMinor } from "@/lib/money/money";
import { getPortfolio, getAvailable } from "@/lib/services/wallets/wallet-service";
import { createQuote } from "@/lib/services/transactions/quote-service";
import { createPlan, getPlanForUser } from "@/lib/services/transactions/plan-service";
import type { CreatePlanInput } from "@/lib/validation/schemas";

/**
 * Controlled tool layer.
 *
 * The language model never receives wallet credentials or direct database
 * access. It proposes structured intent; these server-side tools read real
 * demo state, validate inputs and build plans. Every tool result is derived
 * from backend data, never from model claims.
 */

export const getWalletBalancesInput = z.object({ userId: z.string().min(1) });
export const getExchangeQuoteInput = z.object({
  userId: z.string().min(1),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
});
export const validateRecipientInput = z.object({
  userId: z.string().min(1),
  beneficiaryId: z.string().optional(),
  accountNumber: z.string().optional(),
  address: z.string().optional(),
});
export const prepareTransactionPlanInput = z.object({
  userId: z.string().min(1),
  conversationId: z.string().optional(),
  plan: z.unknown(),
});
export const getTransactionStatusInput = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
});

export function getWalletBalances(userId: string) {
  const portfolio = getPortfolio(userId);
  return {
    totalNgn: portfolio.totalNgn,
    nairaAvailable: portfolio.nairaAvailable,
    nairaPending: portfolio.nairaPending,
    assets: portfolio.assets.map((asset) => ({
      symbol: asset.symbol,
      available: asset.available,
      pending: asset.pending,
      valueNgn: asset.valueNgn,
      network: asset.network,
      simulated: true,
    })),
  };
}

export function getSupportedAssets() {
  return Object.values(ASSETS).map((asset) => ({
    symbol: asset.symbol,
    name: asset.name,
    kind: asset.kind,
    networks: asset.networks.map((network) => ({
      id: network.id,
      name: network.name,
      demo: network.demo,
    })),
  }));
}

export function getExchangeQuote(
  userId: string,
  from: string,
  to: string,
  amount: string,
) {
  if (!(from in ASSETS) || !(to in ASSETS)) {
    throw new Error("Unsupported asset for quote");
  }
  const source = from as AssetSymbol;
  const target = to as AssetSymbol;
  const minor = toMinor(amount, ASSETS[source].decimals);
  const quote = createQuote(userId, { from: source, to: target, amount: minor });
  return {
    ...quote,
    display: `${formatAmount(quote.fromAmount, source)} → ${formatAmount(quote.toAmount, target)}`,
  };
}

export function validateRecipient(
  userId: string,
  input: { beneficiaryId?: string; accountNumber?: string; address?: string },
) {
  const store = getStore();
  if (input.beneficiaryId) {
    const beneficiary = store.getBeneficiary(input.beneficiaryId);
    if (!beneficiary || beneficiary.userId !== userId) {
      return { valid: false, reason: "Beneficiary not found", simulated: true };
    }
    return {
      valid: true,
      beneficiary: beneficiary.name,
      simulated: true,
      note: "Matched a saved demo beneficiary.",
    };
  }
  if (input.accountNumber) {
    return {
      valid: /^\d{10}$/.test(input.accountNumber),
      reason: /^\d{10}$/.test(input.accountNumber)
        ? undefined
        : "Account number must be 10 digits",
      simulated: true,
      note: "Demo format check only. No real account-name lookup was performed.",
    };
  }
  if (input.address) {
    return {
      valid: input.address.length >= 8,
      simulated: true,
      note: "Demo address format check only. No blockchain lookup was performed.",
    };
  }
  return { valid: false, reason: "No recipient details supplied", simulated: true };
}

export function calculateRemainingBalance(userId: string, totalNgn: string) {
  const available = getAvailable(userId, "NGN");
  const remaining = (BigInt(available) - BigInt(totalNgn)).toString();
  return {
    availableNgn: available,
    remainingNgn: remaining,
    simulated: true,
  };
}

export function prepareTransactionPlan(
  userId: string,
  input: CreatePlanInput,
  conversationId?: string,
) {
  return createPlan(userId, { ...input, source: "ai" }, {
    conversationId,
    source: "ai",
  });
}

export function getTransactionStatus(userId: string, planId: string) {
  const plan = getPlanForUser(userId, planId);
  return {
    planId: plan.id,
    status: plan.status,
    simulated: plan.simulated,
    operations: plan.operations.map((operation) => ({
      title: operation.title,
      status: operation.status,
    })),
  };
}
