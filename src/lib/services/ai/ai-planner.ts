import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import { z } from "zod";
import { env } from "@/lib/config/env";
import type { ChatMessage } from "@/lib/types/domain";
import type { AssistantIntent, PlannerContext } from "./types";

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderError";
  }
}

const operationSchema = z.object({
  kind: z.enum([
    "bank_transfer",
    "crypto_transfer",
    "swap",
    "bill_payment",
    "cash_deposit",
    "cash_withdrawal",
  ]),
  amount: z
    .string()
    .nullable()
    .optional()
    .describe("Decimal amount in the source asset, e.g. '200000' or '150.5'. Null if absent."),
  asset: z.string().nullable().optional(),
  fromAsset: z.string().nullable().optional(),
  toAsset: z.string().nullable().optional(),
  beneficiaryHint: z
    .string()
    .nullable()
    .optional()
    .describe("Name or nickname of a saved beneficiary mentioned by the user."),
  recipientName: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  address: z
    .string()
    .nullable()
    .optional()
    .describe("Crypto address explicitly provided by the user. Never invent one."),
  network: z.string().nullable().optional(),
  billerHint: z
    .string()
    .nullable()
    .optional()
    .describe("Saved biller or bill nickname mentioned by the user."),
  billId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

const intentSchema = z.object({
  summary: z.string().describe("One short sentence describing the user's intent."),
  operations: z.array(operationSchema).max(8),
  missingInformation: z
    .array(z.string())
    .describe("Specific missing details. Never guess recipient or payment details."),
  assumptions: z.array(z.string()),
});

export function isAiConfigured(): boolean {
  return Boolean(env.ai.apiKey);
}

export async function extractIntentWithModel(
  message: string,
  context: PlannerContext,
  history: ChatMessage[],
): Promise<AssistantIntent> {
  if (!isAiConfigured()) {
    throw new AiProviderError("No AI provider API key is configured.");
  }

  const provider = createOpenAICompatible({
    name: "nearvora",
    baseURL: env.ai.baseUrl,
    apiKey: env.ai.apiKey,
  });

  const contextPayload = {
    supportedAssets: ["NGN", "USDT", "USDC", "BTC", "ETH"],
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

  try {
    const { object } = await generateObject({
      model: provider(env.ai.model),
      schema: intentSchema,
      temperature: 0,
      system: [
        "You are the intent-extraction engine for Nearvora, a Naira and crypto finance app.",
        "You never execute transactions and you never have wallet access.",
        "Convert the user's request into structured operations.",
        "Use only NGN, USDT, USDC, BTC and ETH.",
        "Only reference beneficiaries and bills supplied in the context. Never invent names, account numbers, addresses, balances, rates or fees.",
        "Amounts must be decimal strings in the SOURCE asset (NGN for transfers, bills, deposits and withdrawals).",
        "If a required value is missing, add a specific question to missingInformation and omit that operation.",
        "The user may state a starting balance; ignore it for calculations because the backend uses actual balances.",
        "A request to leave the remaining balance is not an operation; record it as an assumption.",
      ].join(" "),
      prompt: `Context JSON:\n${JSON.stringify(contextPayload)}\n\nUser message:\n${message}`,
    });

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
      modelName: env.ai.model,
    };
  } catch (error) {
    throw new AiProviderError(
      error instanceof Error
        ? `The configured model call failed: ${error.message}`
        : "The configured model call failed.",
    );
  }
}
