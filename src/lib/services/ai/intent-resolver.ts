import Decimal from "decimal.js";
import { ASSETS, getAsset, getNetwork, type AssetSymbol } from "@/lib/config/assets";
import { getStore } from "@/lib/database/store";
import { getPortfolio } from "@/lib/services/wallets/wallet-service";
import type { CreatePlanInput, PlanOperationInput } from "@/lib/validation/schemas";
import type {
  AssistantIntent,
  AssistantOperationIntent,
  PlannerContext,
} from "./types";

export interface ResolvedIntent {
  plan?: CreatePlanInput;
  missing: string[];
  usedRecipientCheck: boolean;
  hasSwap: boolean;
}

export function buildPlannerContext(userId: string): PlannerContext {
  const store = getStore();
  const portfolio = getPortfolio(userId);
  return {
    beneficiaries: store.listBeneficiaries(userId),
    bills: store.listBills(userId),
    balances: portfolio.assets.map((asset) => ({
      symbol: asset.symbol,
      available: asset.available,
    })),
    nairaAvailable: portfolio.nairaAvailable,
  };
}

export interface ResolvedIntent {
  plan?: CreatePlanInput;
  missing: string[];
  usedRecipientCheck: boolean;
  hasSwap: boolean;
}

export function resolveIntent(intent: AssistantIntent, context: PlannerContext): ResolvedIntent {
  const missing: string[] = [];
  const operations: PlanOperationInput[] = [];
  let usedRecipientCheck = false;
  let hasSwap = false;

  for (const operation of intent.operations) {
    switch (operation.kind) {
      case "bank_transfer": {
        const amount = normalizeAmount(operation.amount);
        if (!amount) {
          missing.push("How much should I transfer?");
          continue;
        }
        const beneficiary = matchBeneficiary(operation, context);
        if (beneficiary) {
          usedRecipientCheck = true;
          operations.push({
            kind: "bank_transfer",
            amount,
            beneficiaryId: beneficiary.id,
            note: operation.note,
          });
          continue;
        }
        if (operation.recipientName && operation.bankName && operation.accountNumber) {
          usedRecipientCheck = true;
          operations.push({
            kind: "bank_transfer",
            amount,
            recipientName: operation.recipientName,
            bankName: operation.bankName,
            accountNumber: operation.accountNumber,
            note: operation.note,
          });
          continue;
        }
        missing.push(
          "I need the recipient's saved beneficiary or full bank details before I can prepare the transfer.",
        );
        continue;
      }

      case "crypto_transfer": {
        const asset = normalizeAsset(operation.asset);
        if (!asset || ASSETS[asset].kind !== "crypto") {
          missing.push("Which supported crypto asset should I send?");
          continue;
        }
        const amount = normalizeAmount(operation.amount);
        if (!amount) {
          missing.push(`How much ${asset} should I send?`);
          continue;
        }
        if (!operation.address || operation.address.length < 8) {
          missing.push(
            `I need a ${asset} recipient address from you. I will not invent a deposit address.`,
          );
          continue;
        }
        const networkId =
          operation.network && getNetwork(asset, operation.network)
            ? operation.network
            : ASSETS[asset].networks[0]?.id;
        if (!networkId) {
          missing.push(`No supported network is configured for ${asset}.`);
          continue;
        }
        operations.push({
          kind: "crypto_transfer",
          asset,
          amount,
          address: operation.address,
          network: networkId,
          note: operation.note,
        });
        usedRecipientCheck = true;
        continue;
      }

      case "swap": {
        const from = normalizeAsset(operation.fromAsset);
        const to = normalizeAsset(operation.toAsset);
        const amount = normalizeAmount(operation.amount);
        if (!from || !to) {
          missing.push("Which two assets should I convert between?");
          continue;
        }
        if (from === to) {
          missing.push("Choose two different assets for the conversion.");
          continue;
        }
        if (!amount) {
          missing.push("How much should I convert?");
          continue;
        }
        operations.push({ kind: "swap", fromAsset: from, toAsset: to, amount });
        hasSwap = true;
        continue;
      }

      case "bill_payment": {
        const bill = matchBill(operation, context);
        if (!bill) {
          missing.push("Which saved bill should I pay?");
          continue;
        }
        const amount = normalizeAmount(operation.amount);
        operations.push({
          kind: "bill_payment",
          billId: bill.id,
          amount: amount ?? undefined,
        });
        continue;
      }

      case "cash_deposit": {
        const amount = normalizeAmount(operation.amount);
        if (!amount) {
          missing.push("How much would you like to deposit?");
          continue;
        }
        operations.push({ kind: "cash_deposit", amount });
        continue;
      }

      case "cash_withdrawal": {
        const amount = normalizeAmount(operation.amount);
        if (!amount) {
          missing.push("How much would you like to withdraw?");
          continue;
        }
        const beneficiary = matchBeneficiary(operation, context);
        if (beneficiary) {
          usedRecipientCheck = true;
          operations.push({
            kind: "cash_withdrawal",
            amount,
            beneficiaryId: beneficiary.id,
          });
          continue;
        }
        if (operation.recipientName && operation.bankName && operation.accountNumber) {
          usedRecipientCheck = true;
          operations.push({
            kind: "cash_withdrawal",
            amount,
            accountName: operation.recipientName,
            bankName: operation.bankName,
            accountNumber: operation.accountNumber,
          });
          continue;
        }
        missing.push("Which saved bank account should receive the withdrawal?");
        continue;
      }

      default:
        missing.push("One requested operation is not supported.");
    }
  }

  if (operations.length === 0) {
    return { missing, usedRecipientCheck, hasSwap };
  }

  return {
    plan: {
      title: intent.summary.slice(0, 100) || "AI money plan",
      source: "ai",
      operations,
    },
    missing,
    usedRecipientCheck,
    hasSwap,
  };
}

function normalizeAmount(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/,/g, "").trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined;
  try {
    if (new Decimal(cleaned).lte(0)) return undefined;
  } catch {
    return undefined;
  }
  return cleaned;
}

function normalizeAsset(value: string | undefined): AssetSymbol | undefined {
  if (!value) return undefined;
  const symbol = value.trim().toUpperCase();
  return getAsset(symbol) ? (symbol as AssetSymbol) : undefined;
}

function matchBeneficiary(operation: AssistantOperationIntent, context: PlannerContext) {
  const hint = (operation.beneficiaryHint ?? operation.recipientName ?? "").toLowerCase().trim();
  if (!hint) return undefined;
  return context.beneficiaries.find((beneficiary) => {
    if (beneficiary.type !== "bank") return false;
    if (beneficiary.name.toLowerCase() === hint) return true;
    if (beneficiary.nickname?.toLowerCase() === hint) return true;
    if (hint.includes(beneficiary.name.toLowerCase())) return true;
    if (beneficiary.nickname && hint.includes(beneficiary.nickname.toLowerCase())) return true;
    const parts = beneficiary.name.toLowerCase().split(" ");
    return parts.some((part) => part.length > 3 && hint.includes(part));
  });
}

function matchBill(operation: AssistantOperationIntent, context: PlannerContext) {
  if (operation.billId) {
    const byId = context.bills.find((bill) => bill.id === operation.billId);
    if (byId) return byId;
  }
  const hint = (operation.billerHint ?? "").toLowerCase().trim();
  if (!hint) return undefined;
  return context.bills.find(
    (bill) =>
      bill.provider.toLowerCase().includes(hint) ||
      hint.includes(bill.provider.toLowerCase()) ||
      bill.nickname.toLowerCase().includes(hint) ||
      bill.category === hint,
  );
}

