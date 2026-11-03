import type { AssetSymbol } from "@/lib/config/assets";
import type { Beneficiary, Bill } from "@/lib/types/domain";

export type IntentOperationKind =
  | "bank_transfer"
  | "crypto_transfer"
  | "swap"
  | "bill_payment"
  | "cash_deposit"
  | "cash_withdrawal";

export interface AssistantOperationIntent {
  kind: IntentOperationKind;
  amount?: string;
  asset?: string;
  fromAsset?: string;
  toAsset?: string;
  beneficiaryHint?: string;
  recipientName?: string;
  bankName?: string;
  accountNumber?: string;
  address?: string;
  network?: string;
  billerHint?: string;
  billId?: string;
  note?: string;
}

export interface AssistantIntent {
  summary: string;
  operations: AssistantOperationIntent[];
  missingInformation: string[];
  assumptions: string[];
  planner: "model" | "fallback";
  modelName?: string;
}

export interface PlannerContext {
  beneficiaries: Beneficiary[];
  bills: Bill[];
  balances: { symbol: AssetSymbol; available: string }[];
  nairaAvailable: string;
}

export interface ChatToolCall {
  name: string;
  status: "ok" | "error";
  summary: string;
}
