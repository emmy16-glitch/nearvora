import { afterEach, describe, expect, it, vi } from "vitest";
import { FlutterwaveError, FlutterwaveTestClient } from "@/lib/services/payments/flutterwave-client";

afterEach(() => vi.unstubAllGlobals());

const client = () => new FlutterwaveTestClient("FLWSECK_TEST-unit-test-key-X", 1000);

describe("Flutterwave test client", () => {
  it("rejects live keys and missing keys before making requests", () => {
    expect(() => new FlutterwaveTestClient("FLWSECK_LIVE-not-allowed")).toThrow(
      expect.objectContaining({ code: "FLUTTERWAVE_TEST_KEY_REQUIRED" }),
    );
    expect(() => new FlutterwaveTestClient("")).toThrow(
      expect.objectContaining({ code: "FLUTTERWAVE_TEST_KEY_REQUIRED" }),
    );
  });

  it("resolves a Nigerian account using Flutterwave's official request shape", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(String(_input)).toBe("https://api.flutterwave.com/v3/accounts/resolve");
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        "Bearer FLWSECK_TEST-unit-test-key-X",
      );
      expect(JSON.parse(String(init?.body))).toEqual({
        account_number: "0690000032",
        account_bank: "044",
      });
      return jsonResponse({
        status: "success",
        message: "Account details fetched",
        data: { account_number: "0690000032", account_name: "Test Customer" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(client().resolveNgBankAccount("0690000032", "044")).resolves.toEqual({
      account_number: "0690000032",
      account_name: "Test Customer",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("loads Nigerian banks, bill categories, billers, service items, and validates a bill customer", async () => {
    const responses = [
      { status: "success", data: [{ code: "044", name: "Access Bank" }] },
      { status: "success", data: [{ id: 1, name: "Airtime", code: "AIRTIME", country_code: "NG" }] },
      { status: "success", data: [{ biller_code: "BIL119", name: "DSTV", country_code: "NG" }] },
      { status: "success", data: [{ biller_code: "BIL119", item_code: "CB141", label_name: "SmartCard Number" }] },
      { status: "success", data: { response_code: "00", name: "Test Customer" } },
    ];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const urls = [
        "https://api.flutterwave.com/v3/banks/NG?include_provider_type=1",
        "https://api.flutterwave.com/v3/top-bill-categories?country=NG",
        "https://api.flutterwave.com/v3/bills/CABLEBILLS/billers?country=NG",
        "https://api.flutterwave.com/v3/billers/BIL119/items",
        "https://api.flutterwave.com/v3/bill-items/CB141/validate?customer=0025401100",
      ];
      expect(String(input)).toBe(urls[fetchMock.mock.calls.length - 1]);
      return jsonResponse(responses[fetchMock.mock.calls.length - 1]);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(client().getNgBanks()).resolves.toMatchObject([{ code: "044" }]);
    await expect(client().getNgBillCategories()).resolves.toMatchObject([{ code: "AIRTIME" }]);
    await expect(client().getNgBillers("CABLEBILLS")).resolves.toMatchObject([{ biller_code: "BIL119" }]);
    await expect(client().getNgBillItems("BIL119")).resolves.toMatchObject([{ item_code: "CB141" }]);
    await expect(client().validateNgBill("CB141", "0025401100")).resolves.toMatchObject({ response_code: "00" });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("creates a one-time NGN bank transfer charge with exact naira conversion", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const url = String(_input);
      expect(url).toBe("https://api.flutterwave.com/v3/charges?type=bank_transfer");
      expect(JSON.parse(String(init?.body))).toMatchObject({
        amount: "1250.50",
        currency: "NGN",
        email: "test@example.com",
        fullname: "Test User",
        phone_number: "+2348000000000",
      });
      return jsonResponse({
        status: "success",
        message: "Charge initiated",
        data: {},
        meta: {
          authorization: {
            transfer_reference: "provider-ref",
            transfer_account: "0123456789",
            transfer_bank: "Flutterwave MFB",
          },
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await client().createNgBankTransferCharge({
      amountMinor: "125050",
      email: "test@example.com",
      fullName: "Test User",
      phoneNumber: "+2348000000000",
      reference: "nearvora-deposit-1",
    });
    expect(result.reference).toBe("nearvora-deposit-1");
    expect(result.charge.transfer_account).toBe("0123456789");
  });

  it("submits a payout only once and converts kobo to naira", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(String(_input)).toBe("https://api.flutterwave.com/v3/transfers");
      expect(JSON.parse(String(init?.body))).toEqual({
        amount: "2000.00",
        account_number: "0690000032",
        account_bank: "044",
        currency: "NGN",
        reference: "nearvora-payout-1",
        narration: "Nearvora test payout",
      });
      return jsonResponse({ status: "success", message: "queued", data: { id: 123, status: "NEW" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(client().initiateNgBankPayout({
      amountMinor: "200000",
      accountNumber: "0690000032",
      bankCode: "044",
      reference: "nearvora-payout-1",
    })).resolves.toMatchObject({ id: 123, status: "NEW" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("passes biller and item identifiers in the path and kobo amount in naira", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(String(_input)).toBe(
        "https://api.flutterwave.com/v3/billers/BIL119/items/CB141/payment",
      );
      expect(JSON.parse(String(init?.body))).toEqual({
        country: "NG",
        customer_id: "0025401100",
        amount: "1800.00",
        reference: "nearvora-bill-1",
      });
      return jsonResponse({ status: "success", message: "paid", data: { tx_ref: "bill-ref" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(client().payNgBill({
      billerCode: "BIL119",
      itemCode: "CB141",
      customerId: "0025401100",
      amountMinor: "180000",
      reference: "nearvora-bill-1",
    })).resolves.toMatchObject({ tx_ref: "bill-ref" });
  });

  it("never retries a transaction-creating request after a timeout", async () => {
    const fetchMock = vi.fn(async () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(client().initiateNgBankPayout({
      amountMinor: "50000",
      accountNumber: "0690000032",
      bankCode: "044",
      reference: "nearvora-timeout-test",
    })).rejects.toMatchObject({ code: "FLUTTERWAVE_TIMEOUT" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not reveal credentials in normalized provider errors", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ status: "error", message: "invalid request" }, 400));
    vi.stubGlobal("fetch", fetchMock);
    const error = await client().resolveNgBankAccount("0000000000", "044").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FlutterwaveError);
    expect(String(error)).not.toContain("unit-test-key");
    expect(error).toMatchObject({ status: 400 });
  });
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
