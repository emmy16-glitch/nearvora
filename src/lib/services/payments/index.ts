import { createId } from "@/lib/database/store";
import { env } from "@/lib/config/env";
import type { User } from "@/lib/types/domain";

export interface VirtualAccount {
  provider: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  simulated: boolean;
  note: string;
}

export interface BankVerification {
  verified: boolean;
  simulated: boolean;
  accountName?: string;
  note: string;
}

export interface PaymentIntent {
  reference: string;
  status: "pending" | "processing" | "completed" | "failed";
  simulated: boolean;
  note: string;
}

/**
 * Provider-agnostic Naira payment boundary. Monnify, Paystack and Flutterwave
 * can be added as adapters once Nearvora has approved credentials. No live
 * provider is configured here and no invented credentials are used.
 */
export interface PaymentProviderAdapter {
  readonly name: string;
  readonly mode: "demo" | "live";
  createVirtualAccount(user: User): Promise<VirtualAccount>;
  verifyBankAccount(accountNumber: string, bankCode: string): Promise<BankVerification>;
  initiateDeposit(input: { amountMinor: string; reference?: string }): Promise<PaymentIntent>;
  initiateWithdrawal(input: {
    amountMinor: string;
    accountNumber: string;
    bankCode: string;
    reference?: string;
  }): Promise<PaymentIntent>;
  payBill(input: {
    amountMinor: string;
    biller: string;
    accountReference: string;
  }): Promise<PaymentIntent>;
}

class DemoPaymentProvider implements PaymentProviderAdapter {
  readonly name = "Nearvora demo payment provider";
  readonly mode = "demo" as const;

  async createVirtualAccount(user: User): Promise<VirtualAccount> {
    return {
      provider: this.name,
      bankName: "Nearvora Demo Bank",
      accountNumber: "0000000000",
      accountName: `DEMO / ${user.name.toUpperCase()}`,
      simulated: true,
      note: "This is a demonstration virtual account. Do not send real money to it.",
    };
  }

  async verifyBankAccount(accountNumber: string): Promise<BankVerification> {
    if (!/^\d{10}$/.test(accountNumber)) {
      return {
        verified: false,
        simulated: true,
        note: "Demo validation: account numbers must be 10 digits.",
      };
    }
    return {
      verified: false,
      simulated: true,
      note: "Demo mode cannot verify real account ownership or account names.",
    };
  }

  async initiateDeposit(input: { reference?: string }): Promise<PaymentIntent> {
    return {
      reference: input.reference ?? createId("demo_dep"),
      status: "completed",
      simulated: true,
      note: "Simulated deposit. No provider settlement occurred.",
    };
  }

  async initiateWithdrawal(): Promise<PaymentIntent> {
    return {
      reference: createId("demo_wd"),
      status: "processing",
      simulated: true,
      note: "Simulated withdrawal. No bank transfer was initiated.",
    };
  }

  async payBill(): Promise<PaymentIntent> {
    return {
      reference: createId("demo_bill"),
      status: "completed",
      simulated: true,
      note: "Simulated bill payment. The biller was not contacted.",
    };
  }
}

class UnconfiguredLiveProvider implements PaymentProviderAdapter {
  readonly name = "Unconfigured live payment provider";
  readonly mode = "live" as const;
  private readonly error = new Error(
    `Live payment provider "${env.payments.provider}" is not configured. Nearvora will not execute real payments without approved provider credentials and webhook verification.`,
  );
  async createVirtualAccount(): Promise<VirtualAccount> {
    throw this.error;
  }
  async verifyBankAccount(): Promise<BankVerification> {
    throw this.error;
  }
  async initiateDeposit(): Promise<PaymentIntent> {
    throw this.error;
  }
  async initiateWithdrawal(): Promise<PaymentIntent> {
    throw this.error;
  }
  async payBill(): Promise<PaymentIntent> {
    throw this.error;
  }
}

export function getPaymentProvider(): PaymentProviderAdapter {
  if (env.demoMode) return new DemoPaymentProvider();
  // LIVE mode never returns the demo adapter, even if PAYMENT_PROVIDER=demo.
  // There are no verified live adapters in this build, so all live operations
  // fail closed rather than simulating a payment.
  return new UnconfiguredLiveProvider();
}
