import type { AssetSymbol } from "@/lib/config/assets";
import type { Minor } from "@/lib/money/money";

export type KycStatus = "unverified" | "pending" | "verified";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  kycStatus: KycStatus;
  createdAt: string;
}

export interface WalletAsset {
  id: string;
  userId: string;
  symbol: AssetSymbol;
  available: Minor;
  pending: Minor;
  address: string;
  network: string;
  updatedAt: string;
}

export interface Beneficiary {
  id: string;
  userId: string;
  type: "bank" | "crypto";
  name: string;
  nickname?: string;
  bankName?: string;
  accountNumber?: string;
  address?: string;
  network?: string;
  risk: "trusted" | "new";
  createdAt: string;
}

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "transfer"
  | "swap"
  | "bill_payment"
  | "airtime"
  | "data"
  | "crypto_receive"
  | "crypto_send";

export type TransactionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type TransactionDirection = "in" | "out" | "neutral";

export interface Transaction {
  id: string;
  userId: string;
  reference: string;
  planId?: string;
  type: TransactionType;
  status: TransactionStatus;
  direction: TransactionDirection;
  title: string;
  description: string;
  asset: AssetSymbol;
  amount: Minor;
  fee: Minor;
  counterparty?: string;
  note?: string;
  simulated: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface Quote {
  id: string;
  userId: string;
  from: AssetSymbol;
  to: AssetSymbol;
  fromAmount: Minor;
  toAmount: Minor;
  rate: string;
  fee: Minor;
  feeAsset: AssetSymbol;
  spreadBps: number;
  slippageBps: number;
  simulated: boolean;
  expiresAt: string;
  createdAt: string;
}

export type LiveSwapStatus =
  | "PENDING_DEPOSIT"
  | "KNOWN_DEPOSIT_TX"
  | "INCOMPLETE_DEPOSIT"
  | "PROCESSING"
  | "SUCCESS"
  | "REFUNDED"
  | "FAILED";

export interface LiveSwap {
  id: string;
  userId: string;
  from: AssetSymbol;
  to: AssetSymbol;
  amountIn: Minor;
  amountOut: Minor;
  minAmountOut?: Minor;
  rate: string;
  recipient: string;
  refundTo: string;
  depositAddress: string;
  depositMemo?: string;
  signature: string;
  correlationId: string;
  status: LiveSwapStatus;
  txHash?: string;
  timeEstimate?: number;
  refundedAmount?: Minor;
  refundReason?: string;
  transactionId?: string;
  simulated: false;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export type PlanOperationKind =
  | "bank_transfer"
  | "crypto_transfer"
  | "swap"
  | "bill_payment"
  | "cash_deposit"
  | "cash_withdrawal";

export type PlanOperationStatus = "pending" | "completed" | "failed" | "skipped";

export interface PlanOperation {
  id: string;
  kind: PlanOperationKind;
  status: PlanOperationStatus;
  title: string;
  asset: AssetSymbol;
  amount: Minor;
  fee: Minor;
  targetAsset?: AssetSymbol;
  targetAmount?: Minor;
  rate?: string;
  recipientName?: string;
  recipientDetail?: string;
  bankName?: string;
  network?: string;
  biller?: string;
  quoteId?: string;
  note?: string;
  simulated: boolean;
  error?: string;
}

export type PlanStatus =
  | "DRAFT"
  | "VALIDATING"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "EXECUTING"
  | "PARTIALLY_COMPLETED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";

export type RiskLevel = "low" | "medium" | "high";

export interface PlanWarning {
  code: string;
  severity: "info" | "warning" | "danger";
  message: string;
}

export interface ExecutionGuard {
  provider: string;
  mode: "demo" | "live";
  verified: boolean;
  simulated: boolean;
  attestationId?: string;
  note: string;
}

export interface TransactionPlan {
  id: string;
  userId: string;
  conversationId?: string;
  status: PlanStatus;
  title: string;
  summary: string;
  operations: PlanOperation[];
  warnings: PlanWarning[];
  totalNgn: Minor;
  remainingNgn: Minor;
  riskLevel: RiskLevel;
  requiresAcknowledgment: boolean;
  simulated: boolean;
  source: "manual" | "ai";
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  failureReason?: string;
  executionGuard?: ExecutionGuard;
}

export interface Approval {
  id: string;
  planId: string;
  userId: string;
  decision: "approved" | "rejected";
  riskLevel: RiskLevel;
  acknowledged: boolean;
  note?: string;
  createdAt: string;
}

export type ChatRole = "user" | "assistant" | "system";

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  planId?: string;
  meta?: {
    simulated: boolean;
    planner: "model" | "fallback" | "system";
    modelName?: string;
    toolCalls?: { name: string; status: "ok" | "error"; summary: string }[];
    missingInformation?: string[];
  };
  createdAt: string;
}

export interface Bill {
  id: string;
  userId: string;
  category: "electricity" | "airtime" | "data";
  provider: string;
  accountReference: string;
  nickname: string;
  outstanding?: Minor;
  currency: "NGN";
  demo: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  kind: "transaction" | "security" | "system";
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export interface IdempotencyRecord {
  key: string;
  userId: string;
  scope: string;
  result: unknown;
  createdAt: string;
}

export interface PortfolioSnapshot {
  totalNgn: Minor;
  changePercent: number;
  nairaAvailable: Minor;
  nairaPending: Minor;
  cryptoValueNgn: Minor;
  assets: WalletAssetView[];
}

export interface WalletAssetView {
  id: string;
  symbol: AssetSymbol;
  name: string;
  kind: "fiat" | "crypto";
  available: Minor;
  pending: Minor;
  valueNgn: Minor;
  address: string;
  network: string;
  color: string;
  rateNgn: string;
}

export interface BillView extends Bill {
  displayName: string;
}
