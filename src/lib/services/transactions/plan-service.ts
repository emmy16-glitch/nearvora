import Decimal from "decimal.js";
import { ASSETS, DEMO_NETWORK_FEES, getNetwork, type AssetSymbol } from "@/lib/config/assets";
import { ApiError } from "@/lib/api/handler";
import { createId, createReference, getStore } from "@/lib/database/store";
import { addMinor, compareMinor, subMinor, toMinor, type Minor } from "@/lib/money/money";
import { formatAmount } from "@/lib/money/format";
import { audit } from "@/lib/security/audit";
import type { CreatePlanInput, PlanOperationInput } from "@/lib/validation/schemas";
import type {
  Approval,
  PlanOperation,
  PlanWarning,
  RiskLevel,
  Transaction,
  TransactionPlan,
  TransactionType,
  TransactionDirection,
} from "@/lib/types/domain";
import { assertQuoteFresh, createQuote, getQuote } from "./quote-service";
import { getAvailable, toNgnValue } from "@/lib/services/wallets/wallet-service";
import { getOutLayerAdapter, toExecutionGuard } from "@/lib/services/outlayer";
import { getLedgerAdapter } from "@/lib/services/accounting";

const BANK_FEE: Minor = "10000";
const PLAN_TTL_MS = 10 * 60 * 1000;
const HIGH_VALUE_NGN = "100000000";
const MEDIUM_VALUE_NGN = "25000000";

interface BuildContext {
  userId: string;
  required: Map<AssetSymbol, Minor>;
  outflowsNgn: Minor;
  depositsNgn: Minor;
  warnings: PlanWarning[];
  highRiskReasons: string[];
  mediumRiskReasons: string[];
}

export function createPlan(
  userId: string,
  input: CreatePlanInput,
  options: { conversationId?: string; source?: "manual" | "ai" } = {},
): TransactionPlan {
  const store = getStore();
  const source = options.source ?? input.source ?? "manual";

  if (input.idempotencyKey) {
    const existing = store.getIdempotency(input.idempotencyKey, userId, "create_plan");
    if (existing) {
      const planId = (existing.result as { planId?: string })?.planId;
      const plan = planId ? store.getPlan(planId) : undefined;
      if (plan) return plan;
    }
  }

  const now = Date.now();
  const planId = createId("plan");
  const context: BuildContext = {
    userId,
    required: new Map(),
    outflowsNgn: "0",
    depositsNgn: "0",
    warnings: [
      {
        code: "DEMO_EXECUTION",
        severity: "info",
        message: "Demo plan: execution is simulated and no real money moves.",
      },
    ],
    highRiskReasons: [],
    mediumRiskReasons: [],
  };

  const operations = input.operations.map((operation) =>
    resolveOperation(context, operation),
  );

  assertFunds(context);

  const totalNgn = context.outflowsNgn;
  const nairaAvailable = getAvailable(userId, "NGN");
  const remainingNgn = addMinor(
    subMinor(nairaAvailable, totalNgn),
    context.depositsNgn,
  );

  if (compareMinor(remainingNgn, "0") < 0) {
    context.warnings.push({
      code: "NEGATIVE_REMAINING",
      severity: "warning",
      message: "This plan uses more than your available Naira balance estimate.",
    });
  }

  if (new Decimal(totalNgn).gte(MEDIUM_VALUE_NGN)) {
    context.mediumRiskReasons.push("Plan value is above ₦250,000");
  }
  if (new Decimal(totalNgn).gte(HIGH_VALUE_NGN)) {
    context.highRiskReasons.push("Plan value is above ₦1,000,000");
    context.warnings.push({
      code: "LARGE_PLAN",
      severity: "danger",
      message: "This is a large plan. Review every recipient and amount carefully.",
    });
  }
  if (operations.length >= 5) {
    context.highRiskReasons.push("Plan contains five or more operations");
  }
  if (context.mediumRiskReasons.length > 0) {
    context.warnings.push({
      code: "ELEVATED_CHECK",
      severity: "warning",
      message: context.mediumRiskReasons.join(". ") + ".",
    });
  }

  const riskLevel: RiskLevel =
    context.highRiskReasons.length > 0
      ? "high"
      : context.mediumRiskReasons.length > 0
        ? "medium"
        : "low";

  const title = input.title ?? defaultTitle(operations);
  const summary = operations
    .map(
      (operation) =>
        `${operation.title} — ${formatAmount(operation.amount, operation.asset)}${
          operation.targetAsset
            ? ` → ${formatAmount(operation.targetAmount ?? "0", operation.targetAsset)}`
            : ""
        }`,
    )
    .join(" · ");

  const plan: TransactionPlan = {
    id: planId,
    userId,
    conversationId: options.conversationId,
    status: "AWAITING_APPROVAL",
    title,
    summary,
    operations,
    warnings: context.warnings,
    totalNgn,
    remainingNgn,
    riskLevel,
    requiresAcknowledgment: riskLevel === "high",
    simulated: true,
    source,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + PLAN_TTL_MS).toISOString(),
  };

  store.addPlan(plan);
  audit({
    userId,
    action: "plan.created",
    entity: "transaction_plan",
    entityId: plan.id,
    metadata: {
      source,
      riskLevel,
      operations: operations.map((operation) => operation.kind),
      simulated: true,
    },
  });

  if (input.idempotencyKey) {
    store.setIdempotency(input.idempotencyKey, userId, "create_plan", { planId: plan.id });
  }

  return plan;
}

function resolveOperation(
  context: BuildContext,
  input: PlanOperationInput,
): PlanOperation {
  const store = getStore();
  const base = {
    id: createId("op"),
    status: "pending" as const,
    simulated: true,
  };

  switch (input.kind) {
    case "bank_transfer": {
      const amount = toMinor(input.amount, 2);
      if (compareMinor(amount, "1") < 0) {
        throw new ApiError(422, "INVALID_AMOUNT", "Transfer amount must be greater than zero.");
      }
      let name = input.recipientName;
      let bankName = input.bankName;
      let accountNumber = input.accountNumber;
      let newRecipient = true;

      if (input.beneficiaryId) {
        const beneficiary = store.getBeneficiary(input.beneficiaryId);
        if (!beneficiary || beneficiary.userId !== context.userId || beneficiary.type !== "bank") {
          throw new ApiError(404, "BENEFICIARY_NOT_FOUND", "That beneficiary could not be found.");
        }
        name = beneficiary.name;
        bankName = beneficiary.bankName;
        accountNumber = beneficiary.accountNumber;
        newRecipient = beneficiary.risk === "new";
      }

      if (!name || !bankName || !accountNumber) {
        throw new ApiError(
          422,
          "MISSING_RECIPIENT",
          "Add the recipient name, bank and 10-digit account number to continue.",
          { missing: ["recipientName", "bankName", "accountNumber"] },
        );
      }
      if (!/^\d{10}$/.test(accountNumber)) {
        throw new ApiError(422, "INVALID_ACCOUNT", "Account number must be 10 digits.");
      }

      const total = addMinor(amount, BANK_FEE);
      requireFunds(context, "NGN", total);
      context.outflowsNgn = addMinor(context.outflowsNgn, total);
      if (newRecipient) flagNewRecipient(context, "Bank recipient", amount);

      return {
        ...base,
        kind: "bank_transfer",
        title: `Transfer to ${name}`,
        asset: "NGN",
        amount,
        fee: BANK_FEE,
        recipientName: name,
        bankName,
        recipientDetail: `${bankName} ••${accountNumber.slice(-4)}`,
        note: input.note,
      };
    }

    case "crypto_transfer": {
      const asset = input.asset as AssetSymbol;
      const config = ASSETS[asset];
      if (!config || config.kind !== "crypto") {
        throw new ApiError(422, "INVALID_ASSET", "Choose a supported crypto asset.");
      }
      const network = getNetwork(asset, input.network);
      if (!network) {
        throw new ApiError(422, "UNSUPPORTED_NETWORK", "That network is not supported for this asset.");
      }
      if (input.address.trim().length < 8) {
        throw new ApiError(422, "INVALID_ADDRESS", "Enter a valid recipient address.");
      }
      const wallet = store.getAsset(context.userId, asset);
      if (wallet && input.address.trim() === wallet.address) {
        throw new ApiError(422, "SELF_TRANSFER", "You cannot send to your own receive address.");
      }
      const amount = toMinor(input.amount, config.decimals);
      if (compareMinor(amount, "1") < 0) {
        throw new ApiError(422, "INVALID_AMOUNT", "Amount must be greater than zero.");
      }
      const fee = toMinor(DEMO_NETWORK_FEES[asset], config.decimals);
      requireFunds(context, asset, addMinor(amount, fee));
      context.outflowsNgn = addMinor(context.outflowsNgn, toNgnValue(addMinor(amount, fee), asset));

      const known = store
        .listBeneficiaries(context.userId)
        .some((beneficiary) => beneficiary.address === input.address.trim());
      if (!known) flagNewRecipient(context, "Crypto address", toNgnValue(amount, asset));

      return {
        ...base,
        kind: "crypto_transfer",
        title: `Send ${formatAmount(amount, asset, { withSymbol: false })} ${asset}`,
        asset,
        amount,
        fee,
        network: network.name,
        recipientDetail: input.address.trim(),
        note: input.note,
      };
    }

    case "swap": {
      const from = input.fromAsset as AssetSymbol;
      const to = input.toAsset as AssetSymbol;
      if (!ASSETS[from] || !ASSETS[to]) {
        throw new ApiError(422, "INVALID_ASSET", "Choose supported assets.");
      }
      const amountMinor = toMinor(input.amount, ASSETS[from].decimals);
      if (compareMinor(amountMinor, "1") < 0) {
        throw new ApiError(422, "INVALID_AMOUNT", "Amount must be greater than zero.");
      }
      const quote = createQuote(context.userId, {
        from,
        to,
        amount: amountMinor,
      });
      if (quote.fromAmount !== amountMinor) {
        throw new ApiError(422, "QUOTE_MISMATCH", "The quote did not match the requested amount.");
      }
      requireFunds(context, from, quote.fromAmount);
      context.outflowsNgn = addMinor(
        context.outflowsNgn,
        toNgnValue(quote.fromAmount, from),
      );
      return {
        ...base,
        kind: "swap",
        title: `Convert ${from} to ${to}`,
        asset: from,
        amount: quote.fromAmount,
        fee: quote.fee,
        targetAsset: to,
        targetAmount: quote.toAmount,
        rate: quote.rate,
        quoteId: quote.id,
        recipientDetail: `${formatAmount(quote.fromAmount, from)} → ${formatAmount(quote.toAmount, to)}`,
      };
    }

    case "bill_payment": {
      const bill = store.getBill(input.billId);
      if (!bill || bill.userId !== context.userId) {
        throw new ApiError(404, "BILL_NOT_FOUND", "That bill could not be found.");
      }
      const rawAmount = input.amount ?? null;
      if (!rawAmount && !bill.outstanding) {
        throw new ApiError(422, "MISSING_BILL_AMOUNT", "Enter the amount to pay for this bill.");
      }
      const amount = rawAmount ? toMinor(rawAmount, 2) : (bill.outstanding ?? "0");
      if (compareMinor(amount, "1") < 0) {
        throw new ApiError(422, "INVALID_AMOUNT", "Bill amount must be greater than zero.");
      }
      const total = addMinor(amount, BANK_FEE);
      requireFunds(context, "NGN", total);
      context.outflowsNgn = addMinor(context.outflowsNgn, total);
      return {
        ...base,
        kind: "bill_payment",
        title: `Pay ${bill.provider}`,
        asset: "NGN",
        amount,
        fee: BANK_FEE,
        biller: bill.provider,
        recipientDetail: `${bill.nickname} ••${bill.accountReference.slice(-4)}`,
      };
    }

    case "cash_deposit": {
      const amount = toMinor(input.amount, 2);
      if (compareMinor(amount, "1") < 0) {
        throw new ApiError(422, "INVALID_AMOUNT", "Deposit amount must be greater than zero.");
      }
      context.depositsNgn = addMinor(context.depositsNgn, amount);
      return {
        ...base,
        kind: "cash_deposit",
        title: "Demo Naira deposit",
        asset: "NGN",
        amount,
        fee: "0",
        recipientDetail: "Demo virtual account",
      };
    }

    case "cash_withdrawal": {
      const amount = toMinor(input.amount, 2);
      if (compareMinor(amount, "1") < 0) {
        throw new ApiError(422, "INVALID_AMOUNT", "Withdrawal amount must be greater than zero.");
      }
      let name = input.accountName;
      let bankName = input.bankName;
      let accountNumber = input.accountNumber;
      let newRecipient = true;
      if (input.beneficiaryId) {
        const beneficiary = store.getBeneficiary(input.beneficiaryId);
        if (!beneficiary || beneficiary.userId !== context.userId || beneficiary.type !== "bank") {
          throw new ApiError(404, "BENEFICIARY_NOT_FOUND", "That beneficiary could not be found.");
        }
        name = beneficiary.name;
        bankName = beneficiary.bankName;
        accountNumber = beneficiary.accountNumber;
        newRecipient = beneficiary.risk === "new";
      }
      if (!name || !bankName || !accountNumber) {
        throw new ApiError(
          422,
          "MISSING_BANK_DETAILS",
          "Add the account name, bank and 10-digit account number.",
        );
      }
      if (!/^\d{10}$/.test(accountNumber)) {
        throw new ApiError(422, "INVALID_ACCOUNT", "Account number must be 10 digits.");
      }
      const total = addMinor(amount, BANK_FEE);
      requireFunds(context, "NGN", total);
      context.outflowsNgn = addMinor(context.outflowsNgn, total);
      if (newRecipient) flagNewRecipient(context, "Withdrawal account", amount);
      return {
        ...base,
        kind: "cash_withdrawal",
        title: `Withdraw to ${name}`,
        asset: "NGN",
        amount,
        fee: BANK_FEE,
        recipientName: name,
        bankName,
        recipientDetail: `${bankName} ••${accountNumber.slice(-4)}`,
      };
    }

    default: {
      const never: never = input;
      throw new ApiError(422, "UNSUPPORTED_OPERATION", `Unsupported operation: ${String(never)}`);
    }
  }
}

function requireFunds(context: BuildContext, asset: AssetSymbol, amount: Minor): void {
  context.required.set(asset, addMinor(context.required.get(asset) ?? "0", amount));
}

function assertFunds(context: BuildContext): void {
  for (const [asset, required] of context.required) {
    const available = getAvailable(context.userId, asset);
    if (compareMinor(available, required) < 0) {
      throw new ApiError(
        422,
        "INSUFFICIENT_FUNDS",
        `Insufficient ${asset}. You need ${formatAmount(required, asset)} but have ${formatAmount(available, asset)}.`,
        { asset, required, available },
      );
    }
  }
}

function flagNewRecipient(context: BuildContext, label: string, amountNgn: Minor): void {
  context.mediumRiskReasons.push(`${label} is new`);
  context.warnings.push({
    code: "NEW_RECIPIENT",
    severity: "warning",
    message: `${label} is not in your saved beneficiaries. Confirm the details carefully.`,
  });
  if (new Decimal(amountNgn).gte(new Decimal("25000000"))) {
    context.highRiskReasons.push(`New ${label.toLowerCase()} for a high-value amount`);
  }
}

function defaultTitle(operations: PlanOperation[]): string {
  if (operations.length === 1) return operations[0].title;
  return `${operations.length}-step money plan`;
}

export function getPlanForUser(userId: string, planId: string): TransactionPlan {
  const plan = getStore().getPlan(planId);
  if (!plan || plan.userId !== userId) {
    throw new ApiError(404, "PLAN_NOT_FOUND", "That plan could not be found.");
  }
  return plan;
}

export function approveAndExecutePlan(
  userId: string,
  planId: string,
  input: { acknowledged: boolean; idempotencyKey?: string; note?: string; ip?: string },
): { plan: TransactionPlan; transactions: Transaction[] } {
  const store = getStore();

  if (input.idempotencyKey) {
    const existing = store.getIdempotency(input.idempotencyKey, userId, "execute_plan");
    if (existing) {
      const id = (existing.result as { planId?: string })?.planId;
      if (id) {
        const plan = getPlanForUser(userId, id);
        const transactions = store
          .listTransactions(userId, { limit: 100 })
          .filter((transaction) => transaction.planId === id);
        return { plan, transactions };
      }
    }
  }

  let plan = getPlanForUser(userId, planId);

  if (plan.status === "COMPLETED" || plan.status === "PARTIALLY_COMPLETED") {
    return {
      plan,
      transactions: store
        .listTransactions(userId, { limit: 100 })
        .filter((transaction) => transaction.planId === plan.id),
    };
  }
  if (plan.status === "EXECUTING" || plan.status === "APPROVED") {
    throw new ApiError(409, "PLAN_BUSY", "This plan is already being executed.");
  }
  if (plan.status !== "AWAITING_APPROVAL") {
    throw new ApiError(409, "PLAN_NOT_APPROVABLE", `This plan can no longer be approved (${plan.status}).`);
  }
  if (new Date(plan.expiresAt).getTime() <= Date.now()) {
    plan = store.updatePlan(plan.id, {
      status: "EXPIRED",
      failureReason: "The plan expired before approval.",
    });
    throw new ApiError(409, "PLAN_EXPIRED", "This plan expired. Prepare a fresh plan to continue.");
  }
  if (plan.requiresAcknowledgment && !input.acknowledged) {
    throw new ApiError(
      428,
      "ACKNOWLEDGMENT_REQUIRED",
      "This high-risk plan needs explicit acknowledgment before it can execute.",
      { requiresAcknowledgment: true, riskLevel: plan.riskLevel },
    );
  }

  for (const operation of plan.operations) {
    if (!operation.quoteId) continue;
    const quote = getQuote(operation.quoteId);
    if (!quote) {
      plan = store.updatePlan(plan.id, {
        status: "EXPIRED",
        failureReason: "An attached quote is no longer available.",
      });
      throw new ApiError(409, "QUOTE_MISSING", "A quote expired. Prepare a fresh plan.");
    }
    try {
      assertQuoteFresh(quote);
    } catch (error) {
      store.updatePlan(plan.id, {
        status: "EXPIRED",
        failureReason: "An attached quote expired before approval.",
      });
      throw error;
    }
    if (quote.fromAmount !== operation.amount || quote.toAmount !== operation.targetAmount) {
      store.updatePlan(plan.id, {
        status: "EXPIRED",
        failureReason: "Quote amounts changed before approval.",
      });
      throw new ApiError(409, "QUOTE_CHANGED", "The quote changed. Review the plan again.");
    }
  }

  assertPlanFunds(plan);

  const guard = getOutLayerAdapter();
  const policyDecision = guard.evaluatePlan(plan);
  if (!policyDecision.allowed) {
    throw new ApiError(
      403,
      "POLICY_REJECTED",
      "The execution policy rejected this plan.",
      { reasons: policyDecision.reasons, policy: policyDecision.policy, mode: guard.mode },
    );
  }

  const approval: Approval = {
    id: createId("approval"),
    planId: plan.id,
    userId,
    decision: "approved",
    riskLevel: plan.riskLevel,
    acknowledged: input.acknowledged,
    note: input.note,
    createdAt: new Date().toISOString(),
  };
  store.addApproval(approval);

  plan = store.updatePlan(plan.id, { status: "APPROVED" });
  plan = store.updatePlan(plan.id, { status: "EXECUTING" });

  const transactions: Transaction[] = [];
  let completed = 0;

  for (let index = 0; index < plan.operations.length; index += 1) {
    const operation = plan.operations[index];
    try {
      const transaction = executeOperation(plan, operation);
      plan.operations[index] = { ...operation, status: "completed" };
      completed += 1;
      transactions.push(transaction);
      store.updatePlan(plan.id, { operations: plan.operations });
    } catch (error) {
      plan.operations[index] = {
        ...operation,
        status: "failed",
        error: error instanceof Error ? error.message : "Operation failed",
      };
      const execution = guard.executePlan(plan);
      plan = store.updatePlan(plan.id, {
        operations: plan.operations,
        status: completed > 0 ? "PARTIALLY_COMPLETED" : "FAILED",
        failureReason:
          error instanceof Error ? error.message : "An operation failed during demo execution.",
        executionGuard: toExecutionGuard(execution),
      });
      audit({
        userId,
        action: "plan.execution_failed",
        entity: "transaction_plan",
        entityId: plan.id,
        metadata: { operation: operation.kind, completed, simulated: true },
        ip: input.ip,
      });
      store.addNotification({
        id: createId("notif"),
        userId,
        title: "Plan partially completed",
        body: `${completed} of ${plan.operations.length} demo operations completed. Review the plan for details.`,
        kind: "transaction",
        read: false,
        createdAt: new Date().toISOString(),
      });
      if (input.idempotencyKey) {
        store.setIdempotency(input.idempotencyKey, userId, "execute_plan", { planId: plan.id });
      }
      return { plan, transactions };
    }
  }

  const execution = guard.executePlan(plan);
  plan = store.updatePlan(plan.id, {
    status: "COMPLETED",
    operations: plan.operations.map((operation) => ({
      ...operation,
      status: "completed" as const,
    })),
    executionGuard: toExecutionGuard(execution),
  });

  try {
    getLedgerAdapter().recordPlan(plan, transactions);
  } catch (ledgerError) {
    console.warn("[nearvora] ledger recording failed", ledgerError);
  }

  audit({
    userId,
    action: "plan.executed",
    entity: "transaction_plan",
    entityId: plan.id,
    metadata: {
      riskLevel: plan.riskLevel,
      operations: plan.operations.length,
      simulated: true,
      approvalId: approval.id,
    },
    ip: input.ip,
  });

  store.addNotification({
    id: createId("notif"),
    userId,
    title: "Demo plan completed",
    body: `${plan.operations.length} simulated operation${plan.operations.length === 1 ? "" : "s"} completed. No real money moved.`,
    kind: "transaction",
    read: false,
    createdAt: new Date().toISOString(),
  });

  if (input.idempotencyKey) {
    store.setIdempotency(input.idempotencyKey, userId, "execute_plan", { planId: plan.id });
  }

  return { plan, transactions };
}

function assertPlanFunds(plan: TransactionPlan): void {
  const required = new Map<AssetSymbol, Minor>();
  for (const operation of plan.operations) {
    if (operation.kind === "cash_deposit") continue;
    const amountRequired =
      operation.kind === "swap"
        ? operation.amount
        : addMinor(operation.amount, operation.fee);
    required.set(
      operation.asset,
      addMinor(required.get(operation.asset) ?? "0", amountRequired),
    );
  }
  for (const [asset, amount] of required) {
    const available = getAvailable(plan.userId, asset);
    if (compareMinor(available, amount) < 0) {
      getStore().updatePlan(plan.id, {
        status: "FAILED",
        failureReason: `Insufficient ${asset} at execution time.`,
      });
      throw new ApiError(
        409,
        "FUNDS_CHANGED",
        `Your ${asset} balance changed. This plan was not executed.`,
        { asset, required: amount, available },
      );
    }
  }
}

function executeOperation(plan: TransactionPlan, operation: PlanOperation): Transaction {
  const store = getStore();
  const userId = plan.userId;

  switch (operation.kind) {
    case "cash_deposit": {
      store.creditAsset(userId, "NGN", operation.amount);
      return record(plan, operation, {
        type: "deposit",
        direction: "in",
        title: operation.title,
        description: "Simulated demo deposit",
        counterparty: "Demo provider",
      });
    }

    case "bank_transfer": {
      store.lockAsset(userId, "NGN", addMinor(operation.amount, operation.fee));
      return record(plan, operation, {
        type: "transfer",
        direction: "out",
        title: operation.title,
        description: `${operation.recipientDetail ?? ""} · simulated bank transfer`,
        counterparty: operation.recipientName,
      });
    }

    case "cash_withdrawal": {
      store.lockAsset(userId, "NGN", addMinor(operation.amount, operation.fee));
      return record(plan, operation, {
        type: "withdrawal",
        direction: "out",
        title: operation.title,
        description: `${operation.recipientDetail ?? ""} · simulated withdrawal`,
        counterparty: operation.recipientName,
      });
    }

    case "bill_payment": {
      store.lockAsset(userId, "NGN", addMinor(operation.amount, operation.fee));
      return record(plan, operation, {
        type: "bill_payment",
        direction: "out",
        title: operation.title,
        description: `${operation.recipientDetail ?? ""} · simulated bill payment`,
        counterparty: operation.biller,
      });
    }

    case "crypto_transfer": {
      if (!operation.network) throw new Error("Missing network");
      store.lockAsset(userId, operation.asset, addMinor(operation.amount, operation.fee));
      return record(plan, operation, {
        type: "crypto_send",
        direction: "out",
        title: operation.title,
        description: `${operation.network} · simulated crypto transfer`,
        counterparty: operation.recipientDetail,
      });
    }

    case "swap": {
      if (!operation.targetAsset || !operation.targetAmount) {
        throw new Error("Swap quote is incomplete");
      }
      if (!operation.quoteId) throw new Error("Swap quote is missing");
      const quote = getQuote(operation.quoteId);
      if (!quote) throw new Error("Swap quote expired");
      assertQuoteFresh(quote);
      store.lockAsset(userId, operation.asset, operation.amount);
      store.creditAsset(userId, operation.targetAsset, operation.targetAmount);
      return record(plan, operation, {
        type: "swap",
        direction: "neutral",
        title: operation.title,
        description: `Simulated ${operation.asset} → ${operation.targetAsset} conversion`,
        counterparty: "Nearvora swap",
      });
    }

    default: {
      const never: never = operation.kind;
      throw new Error(`Unsupported operation ${String(never)}`);
    }
  }
}

function record(
  plan: TransactionPlan,
  operation: PlanOperation,
  details: {
    type: TransactionType;
    direction: TransactionDirection;
    title: string;
    description: string;
    counterparty?: string;
  },
): Transaction {
  const store = getStore();
  const transaction: Transaction = {
    id: createId("tx"),
    userId: plan.userId,
    reference: createReference(),
    planId: plan.id,
    type: details.type,
    status: "completed",
    direction: details.direction,
    title: details.title,
    description: details.description,
    asset: operation.asset,
    amount: operation.amount,
    fee: operation.fee,
    counterparty: details.counterparty,
    note: operation.note,
    simulated: true,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
  store.addTransaction(transaction);
  return transaction;
}

export function cancelPlan(userId: string, planId: string): TransactionPlan {
  const plan = getPlanForUser(userId, planId);
  if (plan.status !== "AWAITING_APPROVAL" && plan.status !== "DRAFT") {
    throw new ApiError(409, "PLAN_NOT_CANCELLABLE", "This plan can no longer be cancelled.");
  }
  const updated = getStore().updatePlan(plan.id, {
    status: "CANCELLED",
    failureReason: "Cancelled by you.",
  });
  audit({
    userId,
    action: "plan.cancelled",
    entity: "transaction_plan",
    entityId: plan.id,
    metadata: { simulated: true },
  });
  return updated;
}

export function quotePreview(userId: string, from: AssetSymbol, to: AssetSymbol, amount: Minor) {
  const quote = createQuote(userId, { from, to, amount });
  return quote;
}

