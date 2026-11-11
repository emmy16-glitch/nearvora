import { z } from "zod";
import Decimal from "decimal.js";
import { assertSameOrigin, fail, handleRoute, ok, parseBody, requireSession } from "@/lib/api/handler";
import { env } from "@/lib/config/env";
import { FlutterwaveError, FlutterwaveTestClient } from "@/lib/services/payments/flutterwave-client";

export const dynamic = "force-dynamic";

const minorAmount = z.string().max(15).regex(/^\d+$/, "Amount must be integer kobo.").refine((value) => BigInt(value) > 0n);
const requestSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("resolve_account"),
    accountNumber: z.string().regex(/^\d{10}$/),
    bankCode: z.string().min(2).max(10),
  }),
  z.object({
    operation: z.literal("create_deposit"),
    amountMinor: minorAmount,
    email: z.string().email(),
    fullName: z.string().min(2).max(120),
    phoneNumber: z.string().min(8).max(20),
    reference: z.string().min(12).max(50).regex(/^[a-z0-9_-]+$/).optional(),
  }),
  z.object({
    operation: z.literal("payout"),
    amountMinor: minorAmount,
    accountNumber: z.string().regex(/^\d{10}$/),
    bankCode: z.string().min(2).max(10),
    reference: z.string().min(12).max(50).regex(/^[a-z0-9_-]+$/),
    narration: z.string().max(120).optional(),
  }),
  z.object({
    operation: z.literal("validate_bill"),
    itemCode: z.string().min(2).max(32),
    customerId: z.string().min(2).max(64),
  }),
  z.object({
    operation: z.literal("bill_payment"),
    billerCode: z.string().min(2).max(32),
    itemCode: z.string().min(2).max(32),
    customerId: z.string().min(2).max(64),
    amountMinor: minorAmount,
    reference: z.string().min(12).max(50).regex(/^[a-z0-9_-]+$/),
  }),
]);

export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireSession();
    const query = new URL(request.url).searchParams;
    const resource = query.get("resource") ?? "status";
    if (resource === "status") {
      return ok({
        configured: /^FLWSECK_TEST-/.test(env.payments.flutterwaveTestSecretKey),
        provider: "flutterwave",
        mode: "test",
      });
    }
    if (!env.payments.flutterwaveTestSecretKey) {
      return fail(503, "FLUTTERWAVE_TEST_NOT_CONFIGURED", "Set FLUTTERWAVE_TEST_SECRET_KEY in the server environment to use Flutterwave sandbox operations.");
    }
    let client: FlutterwaveTestClient;
    try {
      client = new FlutterwaveTestClient(env.payments.flutterwaveTestSecretKey);
    } catch (error) {
      if (error instanceof FlutterwaveError) return fail(error.status, error.code, error.message);
      throw error;
    }
    try {
      switch (resource) {
        case "banks":
          return ok(await client.getNgBanks(), { provider: "flutterwave", mode: "test" });
        case "categories":
          return ok(await client.getNgBillCategories(), { provider: "flutterwave", mode: "test" });
        case "billers": {
          const categoryCode = query.get("categoryCode") ?? "";
          if (!/^[A-Z0-9_-]{2,32}$/i.test(categoryCode)) return fail(422, "INVALID_CATEGORY", "Choose a valid bill category.");
          return ok(await client.getNgBillers(categoryCode), { provider: "flutterwave", mode: "test" });
        }
        case "items": {
          const billerCode = query.get("billerCode") ?? "";
          if (!/^[A-Z0-9_-]{2,32}$/i.test(billerCode)) return fail(422, "INVALID_BILLER", "Choose a valid biller.");
          return ok(await client.getNgBillItems(billerCode), { provider: "flutterwave", mode: "test" });
        }
        default:
          return fail(422, "INVALID_RESOURCE", "Unsupported Flutterwave sandbox resource.");
      }
    } catch (error) {
      if (error instanceof FlutterwaveError) return fail(error.status, error.code, error.message);
      return fail(502, "FLUTTERWAVE_REQUEST_FAILED", "Flutterwave sandbox lookup failed.");
    }
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request);
    await requireSession();
    if (!env.payments.flutterwaveTestSecretKey) {
      return fail(
        503,
        "FLUTTERWAVE_TEST_NOT_CONFIGURED",
        "Set FLUTTERWAVE_TEST_SECRET_KEY in the server environment to use Flutterwave sandbox operations.",
      );
    }

    const input = await parseBody(request, requestSchema);
    let client: FlutterwaveTestClient;
    try {
      client = new FlutterwaveTestClient(env.payments.flutterwaveTestSecretKey);
    } catch (error) {
      if (error instanceof FlutterwaveError) {
        return fail(error.status, error.code, error.message);
      }
      throw error;
    }

    try {
      switch (input.operation) {
        case "resolve_account":
          return ok(await client.resolveNgBankAccount(input.accountNumber, input.bankCode), {
            provider: "flutterwave",
            mode: "test",
          });
        case "create_deposit":
          return ok(await client.createNgBankTransferCharge(input), {
            provider: "flutterwave",
            mode: "test",
            note: "Sandbox-generated account details only. Do not use as a live payment instruction.",
          }, { status: 201 });
        case "payout": {
          const resolved = await client.resolveNgBankAccount(input.accountNumber, input.bankCode);
          if (resolved.account_number !== input.accountNumber || !resolved.account_name) {
            return fail(422, "BANK_ACCOUNT_NOT_VERIFIED", "Flutterwave did not verify this bank account.");
          }
          const payout = await client.initiateNgBankPayout(input);
          return ok({ ...payout, verifiedAccountName: resolved.account_name }, {
            provider: "flutterwave",
            mode: "test",
            note: "Test-mode payout request; no real funds are sent.",
          }, { status: 201 });
        }
        case "validate_bill":
          return ok(await client.validateNgBill(input.itemCode, input.customerId), {
            provider: "flutterwave",
            mode: "test",
          });
        case "bill_payment": {
          const items = await client.getNgBillItems(input.billerCode);
          const item = items.find((candidate) => candidate.item_code === input.itemCode);
          if (!item) {
            return fail(422, "UNKNOWN_BILL_ITEM", "The selected bill item is not available for this biller.");
          }
          if (!item.is_airtime && item.amount !== undefined && Number(item.amount) > 0) {
            const requiredMinor = new Decimal(String(item.amount)).mul(100);
            if (!requiredMinor.isInteger() || requiredMinor.toFixed(0) !== input.amountMinor) {
              return fail(422, "BILL_AMOUNT_MISMATCH", "The amount must match the price returned by Flutterwave for this service.");
            }
          }
          if (item.is_resolvable) {
            const validation = await client.validateNgBill(input.itemCode, input.customerId);
            if (validation.response_code !== "00") {
              return fail(422, "BILL_CUSTOMER_NOT_VALIDATED", "Flutterwave did not validate this bill customer.", { responseMessage: validation.response_message });
            }
          }
          return ok(await client.payNgBill(input), {
            provider: "flutterwave",
            mode: "test",
            note: "Test-mode bill request; no live biller settlement is represented.",
          }, { status: 201 });
        }
      }
    } catch (error) {
      if (error instanceof FlutterwaveError) {
        return fail(error.status, error.code, error.message);
      }
      return fail(502, "FLUTTERWAVE_REQUEST_FAILED", "Flutterwave sandbox request failed. Check the provider operation status before retrying.");
    }
  });
}
