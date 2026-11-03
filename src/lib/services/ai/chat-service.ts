import Decimal from "decimal.js";
import { ApiError } from "@/lib/api/handler";
import { ASSETS, getAsset, getNetwork, type AssetSymbol } from "@/lib/config/assets";
import { createId, getStore } from "@/lib/database/store";
import { formatAmount } from "@/lib/money/format";
import { audit } from "@/lib/security/audit";
import { getPortfolio } from "@/lib/services/wallets/wallet-service";
import type { CreatePlanInput, PlanOperationInput } from "@/lib/validation/schemas";
import type { ChatMessage, Conversation, TransactionPlan, User } from "@/lib/types/domain";
import { createPlan } from "@/lib/services/transactions/plan-service";
import { AiProviderError, extractIntentWithModel, isAiConfigured } from "./ai-planner";
import { produceFallbackIntent } from "./fallback-planner";
import type {
  AssistantIntent,
  AssistantOperationIntent,
  ChatToolCall,
  PlannerContext,
} from "./types";

export interface ChatResult {
  conversationId: string;
  message: ChatMessage;
  plan?: TransactionPlan;
  planner: "model" | "fallback";
  modelConnected: boolean;
  missingInformation: string[];
}

export async function handleChat(input: {
  user: User;
  conversationId?: string;
  message: string;
}): Promise<ChatResult> {
  const store = getStore();
  const user = input.user;

  let conversation: Conversation;
  if (input.conversationId) {
    const existing = store.getConversation(input.conversationId);
    if (!existing || existing.userId !== user.id) {
      throw new ApiError(404, "CONVERSATION_NOT_FOUND", "That conversation could not be found.");
    }
    conversation = existing;
  } else {
    conversation = store.createConversation({
      id: createId("conv"),
      userId: user.id,
      title: input.message.slice(0, 64),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const userMessage: ChatMessage = {
    id: createId("msg"),
    conversationId: conversation.id,
    role: "user",
    content: input.message,
    createdAt: new Date().toISOString(),
  };
  store.addMessage(userMessage);
  store.touchConversation(conversation.id);

  const portfolio = getPortfolio(user.id);
  const context: PlannerContext = {
    beneficiaries: store.listBeneficiaries(user.id),
    bills: store.listBills(user.id),
    balances: portfolio.assets.map((asset) => ({
      symbol: asset.symbol,
      available: asset.available,
    })),
    nairaAvailable: portfolio.nairaAvailable,
  };

  const history = store.listMessages(conversation.id).slice(0, -1);
  let intent: AssistantIntent;
  let modelNote: string | undefined;
  const modelConnected = isAiConfigured();

  if (modelConnected) {
    try {
      intent = await extractIntentWithModel(input.message, context, history);
    } catch (error) {
      if (!(error instanceof AiProviderError)) throw error;
      modelNote = error.message;
      intent = produceFallbackIntent(input.message, context);
    }
  } else {
    intent = produceFallbackIntent(input.message, context);
  }

  const toolCalls: ChatToolCall[] = [
    {
      name: "getWalletBalances",
      status: "ok",
      summary: `Loaded ${portfolio.assets.length} demo asset balances from the backend.`,
    },
  ];

  if (intent.planner === "fallback" && intent.operations.length > 0) {
    toolCalls.push({
      name: "getSupportedAssets",
      status: "ok",
      summary: "Validated assets against the supported demo asset registry.",
    });
  }

  const resolved = resolveIntent(intent, context);
  const missing = [...new Set([...intent.missingInformation, ...resolved.missing])];

  if (resolved.usedRecipientCheck) {
    toolCalls.push({
      name: "validateRecipient",
      status: "ok",
      summary: "Matched recipients against saved demo beneficiaries.",
    });
  }
  if (resolved.hasSwap) {
    toolCalls.push({
      name: "getExchangeQuote",
      status: "ok",
      summary: "Requested a backend quote. Quotes are simulated in demo mode.",
    });
  }

  let plan: TransactionPlan | undefined;
  let assistantContent: string;

  if (missing.length > 0 || !resolved.plan) {
    assistantContent = buildMissingInformationMessage(intent, missing, modelNote);
    toolCalls.push({
      name: "prepareTransactionPlan",
      status: "error",
      summary: "Plan not prepared because required information is missing.",
    });
  } else {
    try {
      plan = createPlan(user.id, resolved.plan, {
        conversationId: conversation.id,
        source: "ai",
      });
      toolCalls.push({
        name: "prepareTransactionPlan",
        status: "ok",
        summary: `Prepared ${plan.operations.length} operation(s) awaiting approval.`,
      });
      assistantContent = buildPlanMessage(plan, intent, modelNote);
      store.touchConversation(conversation.id, input.message.slice(0, 64));
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "I could not prepare that plan. Nothing was executed.";
      assistantContent = [
        "I couldn't prepare that plan:",
        "",
        `**${message}**`,
        "",
        "Nothing has been executed. You can adjust the request or use the manual screens.",
      ].join("\n");
      toolCalls.push({
        name: "prepareTransactionPlan",
        status: "error",
        summary: message.slice(0, 140),
      });
    }
  }

  const assistantMessage: ChatMessage = {
    id: createId("msg"),
    conversationId: conversation.id,
    role: "assistant",
    content: assistantContent,
    planId: plan?.id,
    meta: {
      simulated: true,
      planner: intent.planner,
      modelName: intent.modelName,
      toolCalls,
      missingInformation: missing,
    },
    createdAt: new Date().toISOString(),
  };
  store.addMessage(assistantMessage);
  store.touchConversation(conversation.id);

  audit({
    userId: user.id,
    action: "ai.chat",
    entity: "conversation",
    entityId: conversation.id,
    metadata: {
      planner: intent.planner,
      modelConnected,
      planId: plan?.id,
      missingInformation: missing.length,
      simulated: true,
    },
  });

  return {
    conversationId: conversation.id,
    message: assistantMessage,
    plan,
    planner: intent.planner,
    modelConnected,
    missingInformation: missing,
  };
}

interface ResolvedIntent {
  plan?: CreatePlanInput;
  missing: string[];
  usedRecipientCheck: boolean;
  hasSwap: boolean;
}

function resolveIntent(intent: AssistantIntent, context: PlannerContext): ResolvedIntent {
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

function buildMissingInformationMessage(
  intent: AssistantIntent,
  missing: string[],
  modelNote?: string,
): string {
  const prefix =
    intent.planner === "fallback"
      ? "No AI model is connected, so I used Nearvora's deterministic development planner. It only uses saved demo data and backend balances."
      : "I used the configured AI model to understand your request.";
  const note = modelNote ? `\n\n_${modelNote}_` : "";
  const questions =
    missing.length > 0
      ? missing.map((item) => `- ${item}`).join("\n")
      : "- Tell me what you would like to do next.";
  const assumptions =
    intent.assumptions.length > 0
      ? `\n\nAssumptions:\n${intent.assumptions.map((item) => `- ${item}`).join("\n")}`
      : "";
  return [
    prefix + note,
    "",
    "I need a little more information before preparing a plan:",
    "",
    questions + assumptions,
    "",
    "Nothing has been executed.",
  ].join("\n");
}

function buildPlanMessage(
  plan: TransactionPlan,
  intent: AssistantIntent,
  modelNote?: string,
): string {
  const plannerLine =
    intent.planner === "fallback"
      ? "I used Nearvora's deterministic development planner (no AI model is connected)."
      : `I used ${intent.modelName ?? "the configured AI model"} to understand your request; all amounts, quotes and balances below come from Nearvora's backend.`;
  const note = modelNote ? `\n\n_${modelNote}_` : "";
  const steps = plan.operations
    .map((operation, index) => {
      const target = operation.targetAsset
        ? ` → ${formatAmount(operation.targetAmount ?? "0", operation.targetAsset)}`
        : "";
      const fee =
        operation.fee !== "0"
          ? ` (fee ${formatAmount(operation.fee, operation.asset)})`
          : "";
      const recipient = operation.recipientName
        ? ` to ${operation.recipientName}`
        : operation.recipientDetail
          ? ` · ${operation.recipientDetail}`
          : "";
      return `${index + 1}. ${operation.title}${recipient} — ${formatAmount(operation.amount, operation.asset)}${target}${fee}`;
    })
    .join("\n");

  const warnings = plan.warnings
    .filter((warning) => warning.severity !== "info")
    .map((warning) => `- ${warning.message}`)
    .join("\n");

  return [
    plannerLine + note,
    "",
    "I prepared a plan for your review:",
    "",
    steps,
    "",
    `Estimated total: **${formatAmount(plan.totalNgn, "NGN")}**`,
    `Estimated Naira remaining: **${formatAmount(plan.remainingNgn, "NGN")}**`,
    warnings ? `\nWarnings:\n${warnings}` : "",
    "",
    "This is a demo. Approving it runs simulated operations only — no real money moves. Review the plan below and approve it when you are ready. Nothing has been executed yet.",
  ]
    .filter(Boolean)
    .join("\n");
}
