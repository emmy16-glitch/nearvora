import { z } from "zod";
import { ASSET_SYMBOLS } from "@/lib/config/assets";

export const assetSymbolSchema = z.enum(ASSET_SYMBOLS as [string, ...string[]]);

export const amountSchema = z
  .string()
  .trim()
  .min(1, "Enter an amount")
  .regex(/^\d+(\.\d+)?$/, "Enter a valid amount with up to 8 decimal places");

export const nairaAmountSchema = z
  .string()
  .trim()
  .min(1, "Enter an amount")
  .regex(/^\d+(\.\d{1,2})?$/, "Naira amounts support at most 2 decimal places");

export const bankAccountSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Enter a valid 10-digit NUBAN account number");

export const networkIdSchema = z
  .string()
  .trim()
  .min(1, "Select a network")
  .max(64);

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8, "Idempotency key is too short")
  .max(128);

export const planOperationInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("bank_transfer"),
    amount: nairaAmountSchema,
    beneficiaryId: z.string().min(1).optional(),
    recipientName: z.string().trim().min(2).max(80).optional(),
    bankName: z.string().trim().min(2).max(80).optional(),
    accountNumber: bankAccountSchema.optional(),
    note: z.string().trim().max(140).optional(),
  }),
  z.object({
    kind: z.literal("crypto_transfer"),
    asset: assetSymbolSchema,
    network: networkIdSchema,
    amount: amountSchema,
    address: z.string().trim().min(8).max(200),
    note: z.string().trim().max(140).optional(),
  }),
  z.object({
    kind: z.literal("swap"),
    fromAsset: assetSymbolSchema,
    toAsset: assetSymbolSchema,
    amount: amountSchema,
  }),
  z.object({
    kind: z.literal("bill_payment"),
    billId: z.string().min(1),
    amount: nairaAmountSchema.optional(),
  }),
  z.object({
    kind: z.literal("cash_deposit"),
    amount: nairaAmountSchema,
  }),
  z.object({
    kind: z.literal("cash_withdrawal"),
    amount: nairaAmountSchema,
    beneficiaryId: z.string().min(1).optional(),
    bankName: z.string().trim().min(2).max(80).optional(),
    accountNumber: bankAccountSchema.optional(),
    accountName: z.string().trim().min(2).max(80).optional(),
  }),
]);

export const createPlanSchema = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  source: z.enum(["manual", "ai"]).default("manual"),
  operations: z.array(planOperationInputSchema).min(1).max(8),
  idempotencyKey: idempotencyKeySchema.optional(),
});

export const approvePlanSchema = z.object({
  idempotencyKey: idempotencyKeySchema.optional(),
  acknowledged: z.boolean().default(false),
  note: z.string().trim().max(140).optional(),
});

export const quoteRequestSchema = z
  .object({
    from: assetSymbolSchema,
    to: assetSymbolSchema,
    amount: amountSchema,
    side: z.enum(["from", "to"]).default("from"),
  })
  .refine((value) => value.from !== value.to, {
    message: "Choose two different assets",
    path: ["to"],
  });

export const depositSchema = z.object({
  amount: nairaAmountSchema,
  idempotencyKey: idempotencyKeySchema.optional(),
});

export const createLiveSwapSchema = z
  .object({
    from: assetSymbolSchema,
    to: assetSymbolSchema,
    amount: amountSchema,
    originAssetId: z.string().trim().min(3).max(300).optional(),
    destinationAssetId: z.string().trim().min(3).max(300).optional(),
    recipient: z.string().trim().min(8).max(200),
    refundTo: z.string().trim().min(8).max(200),
    depositType: z.enum(["ORIGIN_CHAIN", "INTENTS", "CONFIDENTIAL_INTENTS"]).optional(),
    recipientType: z
      .enum(["DESTINATION_CHAIN", "INTENTS", "CONFIDENTIAL_INTENTS"])
      .optional(),
    refundType: z
      .enum(["ORIGIN_CHAIN", "INTENTS", "CONFIDENTIAL_INTENTS"])
      .optional(),
    slippageBps: z.number().int().min(1).max(5000).optional(),
  })
  .refine((value) => value.from !== value.to, {
    message: "Choose two different assets",
    path: ["to"],
  });

export const liveSwapDepositSchema = z.object({
  txHash: z.string().trim().min(8, "Enter the deposit transaction hash").max(200),
});

export const chatSchema = z.object({
  conversationId: z.string().min(1).optional(),
  message: z.string().trim().min(2, "Tell the assistant what you need").max(2000),
});

export const beneficiarySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("bank"),
    name: z.string().trim().min(2).max(80),
    nickname: z.string().trim().max(40).optional(),
    bankName: z.string().trim().min(2).max(80),
    accountNumber: bankAccountSchema,
  }),
  z.object({
    type: z.literal("crypto"),
    name: z.string().trim().min(2).max(80),
    nickname: z.string().trim().max(40).optional(),
    address: z.string().trim().min(8).max(200),
    network: networkIdSchema,
    asset: assetSymbolSchema,
  }),
]);

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type PlanOperationInput = z.infer<typeof planOperationInputSchema>;
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
export type ChatInput = z.infer<typeof chatSchema>;
export type CreateLiveSwapInput = z.infer<typeof createLiveSwapSchema>;
