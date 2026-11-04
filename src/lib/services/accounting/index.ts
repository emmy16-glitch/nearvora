import { createId } from "@/lib/database/store";
import { env } from "@/lib/config/env";
import type { Transaction, TransactionPlan } from "@/lib/types/domain";

export interface LedgerLine {
  account: string;
  asset: string;
  amount: string;
  direction: "debit" | "credit";
}

export interface LedgerRecord {
  id: string;
  planId: string;
  simulated: boolean;
  lines: LedgerLine[];
  createdAt: string;
}

export interface LedgerAdapter {
  readonly name: string;
  readonly mode: "demo" | "live";
  recordPlan(plan: TransactionPlan, transactions: Transaction[]): LedgerRecord;
}

/**
 * Demo double-entry recorder. It keeps an internal journal for auditability but
 * it does not create, hold or guarantee customer funds. Funds reconciliation
 * with the payment/custody providers remains mandatory.
 */
class DemoLedgerAdapter implements LedgerAdapter {
  readonly name = "Nearvora internal demo ledger";
  readonly mode = "demo" as const;
  private records: LedgerRecord[] = [];

  recordPlan(plan: TransactionPlan, transactions: Transaction[]): LedgerRecord {
    const lines: LedgerLine[] = [];
    for (const transaction of transactions) {
      const account = accountFor(transaction.type);
      lines.push({
        account,
        asset: transaction.asset,
        amount: transaction.amount,
        direction: "debit",
      });
      lines.push({
        account: "nearvora:customer_liability",
        asset: transaction.asset,
        amount: transaction.amount,
        direction: "credit",
      });
    }
    const record: LedgerRecord = {
      id: createId("journal"),
      planId: plan.id,
      simulated: true,
      lines,
      createdAt: new Date().toISOString(),
    };
    this.records.push(record);
    if (this.records.length > 1_000) this.records.shift();
    return record;
  }

  listRecords(): LedgerRecord[] {
    return [...this.records];
  }
}

class FormanceLedgerAdapter implements LedgerAdapter {
  readonly name = "Formance Ledger (unconfigured)";
  readonly mode = "live" as const;
  recordPlan(): LedgerRecord {
    throw new Error(
      "Formance Ledger is not configured. Set FORMANCE_LEDGER_URL and FORMANCE_LEDGER_TOKEN after verifying the official API contract.",
    );
  }
}

function accountFor(type: Transaction["type"]): string {
  switch (type) {
    case "deposit":
    case "crypto_receive":
      return "nearvora:provider_clearing";
    case "withdrawal":
      return "nearvora:customer_payable";
    case "transfer":
      return "nearvora:bank_settlement";
    case "swap":
      return "nearvora:swap_desk";
    case "bill_payment":
      return "nearvora:biller_payable";
    default:
      return "nearvora:suspense";
  }
}

const demoLedger = new DemoLedgerAdapter();

export function getLedgerAdapter(): LedgerAdapter {
  if (env.formance.url && env.formance.token) return new FormanceLedgerAdapter();
  if (!env.demoMode) {
    // Never write a simulated journal in LIVE mode. FormanceAdapter throws
    // because the live API contract has not been verified.
    return new FormanceLedgerAdapter();
  }
  return demoLedger;
}

export { demoLedger };
