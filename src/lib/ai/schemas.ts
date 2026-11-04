import { z } from "zod";

export const intentOperationSchema = z.object({
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

export const intentSchema = z.object({
  summary: z.string().describe("One short sentence describing the user's intent."),
  operations: z.array(intentOperationSchema).max(8),
  missingInformation: z
    .array(z.string())
    .describe("Specific missing details. Never guess recipient or payment details."),
  assumptions: z.array(z.string()),
});

export type IntentObject = z.infer<typeof intentSchema>;
export type IntentOperationObject = z.infer<typeof intentOperationSchema>;

export const chatRequestSchema = z.object({
  conversationId: z.string().min(1).max(100).optional(),
  message: z.string().trim().min(1).max(2000),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
