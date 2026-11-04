import { z } from "zod";
import { ASSET_SYMBOLS } from "@/lib/config/assets";
import { getAiProvider } from "@/lib/ai/provider";
import { NEARVORA_AI_INTENT_PROMPT } from "@/lib/ai/system-prompt";
import { assertUsageAllowed, recordUsage } from "@/lib/ai/usage";
import { normalizeAiError } from "@/lib/ai/errors";
import type { ChatMessage } from "@/lib/types/domain";
import { intentSchema } from "@/lib/ai/schemas";
import type { AssistantIntent, PlannerContext } from "./types";

export { isAiConfigured } from "@/lib/ai/model-config";
export { AiError as AiProviderError } from "@/lib/ai/errors";

export async function extractIntentWithModel(
  message: string,
  context: PlannerContext,
  history: ChatMessage[],
  userId = "anonymous",
): Promise<AssistantIntent> {
  assertUsageAllowed(userId);

  const contextPayload = {
    supportedAssets: ASSET_SYMBOLS,
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
    };
  } catch (error) {
    throw normalizeAiError(error);
  }
}
