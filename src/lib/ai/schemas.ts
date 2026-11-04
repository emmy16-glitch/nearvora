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
    .describe("Decimal amount in the source asset, e.g. '200000' or '150.5'. Null if absent."),
  asset: z.string().nullable(),
  fromAsset: z.string().nullable(),
  toAsset: z.string().nullable(),
  beneficiaryHint: z
    .string()
    .nullable()
    .describe("Name or nickname of a saved beneficiary mentioned by the user."),
  recipientName: z.string().nullable(),
  bankName: z.string().nullable(),
  accountNumber: z.string().nullable(),
  address: z
    .string()
    .nullable()
    .describe("Crypto address explicitly provided by the user. Never invent one."),
  network: z.string().nullable(),
  billerHint: z
    .string()
    .nullable()
    .describe("Saved biller or bill nickname mentioned by the user."),
  billId: z.string().nullable(),
  note: z.string().nullable(),
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
