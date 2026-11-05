import { z } from "zod";
import { ASSETS, ASSET_SYMBOLS } from "@/lib/config/assets";
import { getAiProvider } from "@/lib/ai/provider";
import { NEARVORA_AI_INTENT_PROMPT, NEARVORA_AI_SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { assertUsageAllowed, recordUsage } from "@/lib/ai/usage";
import { normalizeAiError } from "@/lib/ai/errors";
import { getRates } from "@/lib/services/rates";
import type { ChatMessage } from "@/lib/types/domain";
import { intentSchema } from "@/lib/ai/schemas";
import type { AssistantIntent, PlannerContext } from "./types";

export { isAiConfigured } from "@/lib/ai/model-config";
export { AiError as AiProviderError } from "@/lib/ai/errors";

function buildRatesContext() {
  try {
    const snapshot = getRates();
    return {
      source: snapshot.source,
      simulated: snapshot.simulated,
      values: snapshot.rates.map((rate) => ({
        symbol: rate.symbol,
        ngnPerUnit: rate.rateNgn,
      })),
    };
  } catch {
    return { available: false };
  }
}

function buildContextPayload(context: PlannerContext, history: ChatMessage[]) {
  return {
    supportedAssets: ASSET_SYMBOLS,
    supportedNetworks: ASSET_SYMBOLS.map((symbol) => ({
      symbol,
      networks: ASSETS[symbol].networks.map((network) => ({
        id: network.id,
        name: network.name,
        demo: network.demo,
      })),
    })),
    balances: context.balances,
    nairaAvailableMinorUnits: context.nairaAvailable,
    savedBeneficiaries: context.beneficiaries.map((beneficiary) => ({
      id: beneficiary.id,
      type: beneficiary.type,
      name: beneficiary.name,
      nickname: beneficiary.nickname,
      bankName: beneficiary.bankName,
      accountLast4: beneficiary.accountNumber?.slice(-4),
      network: beneficiary.network,
    })),
    rates: buildRatesContext(),
    savedBills: context.bills.map((bill) => ({
      id: bill.id,
      category: bill.category,
      provider: bill.provider,
      nickname: bill.nickname,
      outstandingMinorUnits: bill.outstanding,
    })),
    conversation: history.slice(-8).map((item) => ({
      role: item.role,
      content: item.content,
    })),
  };
}

export async function extractIntentWithModel(
  message: string,
  context: PlannerContext,
  history: ChatMessage[],
  userId = "anonymous",
): Promise<AssistantIntent> {
  assertUsageAllowed(userId);

  const contextPayload = buildContextPayload(context, history);

  try {
    const result = await getAiProvider().generateObject<z.infer<typeof intentSchema>>(
      intentSchema,
      {
        system: NEARVORA_AI_INTENT_PROMPT,
        messages: [
          {
            role: "user",
            content: `Context JSON:\n${JSON.stringify(contextPayload)}\n\nUser message:\n${message}`,
          },
        ],
        temperature: 0,
      },
    );

    recordUsage(userId, result.usage);

    const object = result.object;
    return {
      summary: object.summary,
      operations: object.operations.map((operation) => ({
        kind: operation.kind,
        amount: operation.amount ?? undefined,
        asset: operation.asset ?? undefined,
        fromAsset: operation.fromAsset ?? undefined,
        toAsset: operation.toAsset ?? undefined,
        beneficiaryHint: operation.beneficiaryHint ?? undefined,
        recipientName: operation.recipientName ?? undefined,
        bankName: operation.bankName ?? undefined,
        accountNumber: operation.accountNumber ?? undefined,
        address: operation.address ?? undefined,
        network: operation.network ?? undefined,
        billerHint: operation.billerHint ?? undefined,
        billId: operation.billId ?? undefined,
        note: operation.note ?? undefined,
      })),
      missingInformation: object.missingInformation,
      assumptions: object.assumptions,
      planner: "model",
      modelName: "Nearvora AI",
    };
  } catch (error) {
    throw normalizeAiError(error);
  }
}

/**
 * Answers a general account question using the same backend context that the
 * intent engine receives. The model never receives wallet keys and cannot
 * execute anything; this path is text-only.
 */
export async function answerWithModel(
  message: string,
  context: PlannerContext,
  history: ChatMessage[],
  userId = "anonymous",
): Promise<string> {
  assertUsageAllowed(userId);

  const contextPayload = buildContextPayload(context, history);
  try {
    const result = await getAiProvider().chat({
      system: [
        NEARVORA_AI_SYSTEM_PROMPT,
        "For this request you are answering a question, not preparing a transaction.",
        "Ground every numeric claim in the context JSON. It is the only source of account facts.",
        "Rates in the context are simulated demo rates. Label them as simulated and never claim they are live.",
        "Never invent or recall a rate, quote, fee, balance, transaction, beneficiary, address or product feature that is not in the context. If a value is absent, say it is unavailable in this demo.",
        "For how-to questions, describe only the Nearvora flows implemented in this demo. Do not invent external payment methods or product features.",
        "Use only the asset networks listed in the context. Never suggest mainnet or an unsupported network.",
        "Do not claim that any transfer, swap, bill payment or withdrawal was executed.",
      ].join(" "),
      messages: [
        {
          role: "user",
          content: `Context JSON:\n${JSON.stringify(contextPayload)}\n\nUser question:\n${message}`,
        },
      ],
      temperature: 0,
      maxOutputTokens: 600,
    });
    recordUsage(userId, result.usage);
    const text = result.text.trim();
    if (!text) throw new Error("empty model response");
    return text;
  } catch (error) {
    throw normalizeAiError(error);
  }
}
