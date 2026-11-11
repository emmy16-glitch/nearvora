import { randomUUID } from "node:crypto";
import Decimal from "decimal.js";

const API_BASE = "https://api.flutterwave.com/v3";

export class FlutterwaveError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = "FLUTTERWAVE_ERROR",
  ) {
    super(message);
    this.name = "FlutterwaveError";
  }
}

type FlutterwaveEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
  meta?: unknown;
};

export type BankResolution = {
  account_number: string;
  account_name: string;
};

export type FlutterwaveBank = { id?: number; code: string; name: string };
export type FlutterwaveBillCategory = { id: number; name: string; code: string; country_code: string };
export type FlutterwaveBiller = { biller_code: string; name: string; short_name?: string; country_code?: string };
export type FlutterwaveBillItem = {
  biller_code: string;
  item_code: string;
  name?: string;
  short_name?: string;
  label_name?: string;
  amount?: number;
  fee?: number;
  is_airtime?: boolean;
  is_resolvable?: boolean;
  reg_expression?: string;
};

export type TransferCharge = {
  transfer_reference?: string;
  transfer_account?: string;
  transfer_bank?: string;
  account_expiration?: string;
  transfer_amount?: string;
  transfer_note?: string;
};

export type ProviderOperation = {
  id?: number | string;
  reference?: string;
  tx_ref?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
  [key: string]: unknown;
};

/**
 * Minimal Flutterwave v3 client. Intentionally test-mode only: no live key can
 * be used until a separately reviewed production ledger and authorization path
 * exists. Requests that may create transactions are never automatically retried.
 */
export class FlutterwaveTestClient {
  constructor(
    private readonly secretKey: string,
    private readonly timeoutMs = 20_000,
  ) {
    if (!secretKey || !secretKey.startsWith("FLWSECK_TEST-")) {
      throw new FlutterwaveError(
        "Flutterwave test mode requires a test secret key beginning FLWSECK_TEST-.",
        503,
        "FLUTTERWAVE_TEST_KEY_REQUIRED",
      );
    }
  }

  async getNgBanks(): Promise<FlutterwaveBank[]> {
    return this.request<FlutterwaveBank[]>("/banks/NG?include_provider_type=1", { method: "GET" });
  }

  async getNgBillCategories(): Promise<FlutterwaveBillCategory[]> {
    return this.request<FlutterwaveBillCategory[]>("/top-bill-categories?country=NG", { method: "GET" });
  }

  async getNgBillers(categoryCode: string): Promise<FlutterwaveBiller[]> {
    return this.request<FlutterwaveBiller[]>(
      `/bills/${encodeURIComponent(categoryCode)}/billers?country=NG`,
      { method: "GET" },
    );
  }

  async getNgBillItems(billerCode: string): Promise<FlutterwaveBillItem[]> {
    return this.request<FlutterwaveBillItem[]>(
      `/billers/${encodeURIComponent(billerCode)}/items`,
      { method: "GET" },
    );
  }

  async validateNgBill(itemCode: string, customerId: string): Promise<Record<string, unknown>> {
    const query = new URLSearchParams({ customer: customerId });
    return this.request<Record<string, unknown>>(
      `/bill-items/${encodeURIComponent(itemCode)}/validate?${query.toString()}`,
      { method: "GET" },
    );
  }

  async resolveNgBankAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<BankResolution> {
    const result = await this.request<BankResolution>("/accounts/resolve", {
      method: "POST",
      body: JSON.stringify({ account_number: accountNumber, account_bank: bankCode }),
    });
    if (!result.account_name || !result.account_number) {
      throw new FlutterwaveError("Flutterwave returned incomplete bank details.", 502);
    }
    return result;
  }

  async createNgBankTransferCharge(input: {
    amountMinor: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    reference?: string;
  }): Promise<{ reference: string; charge: TransferCharge }> {
    const reference = input.reference ?? `nv_dep_${randomUUID().replace(/-/g, "")}`;
    const result = await this.requestEnvelope<{
      tx_ref?: string;
    }>("/charges?type=bank_transfer", {
      method: "POST",
      body: JSON.stringify({
        tx_ref: reference,
        amount: minorToMajor(input.amountMinor),
        currency: "NGN",
        email: input.email,
        fullname: input.fullName,
        phone_number: input.phoneNumber,
      }),
    });
    const metadata = result.meta as { authorization?: TransferCharge } | undefined;
    const charge = metadata?.authorization;
    if (!charge?.transfer_account || !charge.transfer_bank) {
      throw new FlutterwaveError("Flutterwave did not return bank transfer details.", 502);
    }
    return { reference: result.data?.tx_ref ?? reference, charge };
  }

  async initiateNgBankPayout(input: {
    amountMinor: string;
    accountNumber: string;
    bankCode: string;
    reference: string;
    narration?: string;
  }): Promise<ProviderOperation> {
    return this.request<ProviderOperation>("/transfers", {
      method: "POST",
      body: JSON.stringify({
        amount: minorToMajor(input.amountMinor),
        account_number: input.accountNumber,
        account_bank: input.bankCode,
        currency: "NGN",
        reference: input.reference,
        narration: input.narration ?? "Nearvora test payout",
      }),
    });
  }

  async payNgBill(input: {
    billerCode: string;
    itemCode: string;
    customerId: string;
    amountMinor: string;
    reference: string;
  }): Promise<ProviderOperation> {
    const biller = encodeURIComponent(input.billerCode);
    const item = encodeURIComponent(input.itemCode);
    return this.request<ProviderOperation>(
      `/billers/${biller}/items/${item}/payment`,
      {
        method: "POST",
        body: JSON.stringify({
          country: "NG",
          customer_id: input.customerId,
          amount: minorToMajor(input.amountMinor),
          reference: input.reference,
        }),
      },
    );
  }

  async verifyTransaction(id: string): Promise<ProviderOperation> {
    if (!/^\d+$/.test(id)) {
      throw new FlutterwaveError("Invalid Flutterwave transaction ID.", 422, "INVALID_TRANSACTION_ID");
    }
    return this.request<ProviderOperation>(`/transactions/${id}/verify`, { method: "GET" });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const payload = await this.requestEnvelope<T>(path, init);
    return payload.data as T;
  }

  private async requestEnvelope<T>(path: string, init: RequestInit): Promise<FlutterwaveEnvelope<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
          ...init.headers,
        },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as FlutterwaveEnvelope<T>;
      if (!response.ok || payload.status !== "success" || payload.data === undefined) {
        const safeMessage = typeof payload.message === "string"
          ? payload.message.slice(0, 240)
          : "Flutterwave request failed.";
        throw new FlutterwaveError(safeMessage, response.status || 502);
      }
      return payload;
    } catch (error) {
      if (error instanceof FlutterwaveError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new FlutterwaveError("Flutterwave request timed out. Check the operation status before retrying.", 504, "FLUTTERWAVE_TIMEOUT");
      }
      throw new FlutterwaveError("Could not contact Flutterwave. Check the operation status before retrying.", 502, "FLUTTERWAVE_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }
  }
}

function minorToMajor(value: string): string {
  if (!/^\d+$/.test(value)) {
    throw new FlutterwaveError("Amount must be a positive integer in kobo.", 422, "INVALID_AMOUNT");
  }
  const major = new Decimal(value).dividedBy(100);
  if (!major.isFinite() || !major.isPositive()) {
    throw new FlutterwaveError("Amount must be greater than zero.", 422, "INVALID_AMOUNT");
  }
  return major.toFixed(2);
}
