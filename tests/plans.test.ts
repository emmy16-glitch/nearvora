import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/handler";
import { DEMO_USER } from "@/lib/database/seed-data";
import { getStore } from "@/lib/database/store";
import { createPlanSchema } from "@/lib/validation/schemas";
import {
  approveAndExecutePlan,
  cancelPlan,
  createPlan,
} from "@/lib/services/transactions/plan-service";

const transferInput = (amount: string, idempotencyKey?: string) =>
  createPlanSchema.parse({
    title: "Naira bank transfer",
    operations: [
      {
        kind: "bank_transfer",
        amount,
        beneficiaryId: "ben_brother",
      },
    ],
    idempotencyKey,
  });

describe("transaction plan engine", () => {
  beforeEach(() => {
    getStore().seed();
  });

  it("creates a review-first plan and never executes during creation", () => {
    const before = getStore().getAsset(DEMO_USER.id, "NGN")!.available;
    const plan = createPlan(DEMO_USER.id, transferInput("200000"));

    expect(plan.status).toBe("AWAITING_APPROVAL");
    expect(plan.simulated).toBe(true);
    expect(plan.operations).toHaveLength(1);
    expect(plan.totalNgn).toBe("20010000");
    expect(plan.remainingNgn).toBe("104990000");
    expect(plan.riskLevel).toBe("low");
    expect(getStore().getAsset(DEMO_USER.id, "NGN")!.available).toBe(before);
    expect(getStore().listTransactions(DEMO_USER.id)).toHaveLength(10);
  });

  it("deduplicates plan creation with an idempotency key", () => {
    const first = createPlan(DEMO_USER.id, transferInput("50000", "create-key-123"));
    const second = createPlan(DEMO_USER.id, transferInput("50000", "create-key-123"));

    expect(second.id).toBe(first.id);
    expect(getStore().listPlans(DEMO_USER.id)).toHaveLength(1);
  });

  it("requires acknowledgment for high-risk plans", () => {
    const plan = createPlan(DEMO_USER.id, transferInput("1100000"));
    expect(plan.riskLevel).toBe("high");
    expect(plan.requiresAcknowledgment).toBe(true);

    expect(() =>
      approveAndExecutePlan(DEMO_USER.id, plan.id, { acknowledged: false }),
    ).toThrowError(ApiError);

    try {
      approveAndExecutePlan(DEMO_USER.id, plan.id, { acknowledged: false });
    } catch (error) {
      expect((error as ApiError).code).toBe("ACKNOWLEDGMENT_REQUIRED");
      expect((error as ApiError).status).toBe(428);
    }

    expect(getStore().getPlan(plan.id)!.status).toBe("AWAITING_APPROVAL");
  });

  it("executes a simulated plan once and updates the demo ledger", () => {
    const plan = createPlan(DEMO_USER.id, transferInput("200000"));
    const result = approveAndExecutePlan(DEMO_USER.id, plan.id, {
      acknowledged: false,
      idempotencyKey: "execute-key-123",
    });

    expect(result.plan.status).toBe("COMPLETED");
    expect(result.plan.executionGuard?.simulated).toBe(true);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].simulated).toBe(true);
    expect(result.transactions[0].amount).toBe("20000000");
    expect(getStore().getAsset(DEMO_USER.id, "NGN")!.available).toBe("104990000");

    const retry = approveAndExecutePlan(DEMO_USER.id, plan.id, {
      acknowledged: false,
      idempotencyKey: "execute-key-123",
    });
    expect(retry.transactions).toHaveLength(1);
    expect(getStore().getAsset(DEMO_USER.id, "NGN")!.available).toBe("104990000");
  });

  it("cancels only plans that have not been approved", () => {
    const plan = createPlan(DEMO_USER.id, transferInput("25000"));
    const cancelled = cancelPlan(DEMO_USER.id, plan.id);

    expect(cancelled.status).toBe("CANCELLED");
    expect(() =>
      approveAndExecutePlan(DEMO_USER.id, plan.id, { acknowledged: false }),
    ).toThrowError(ApiError);
  });

  it("rejects transfers above the backend balance", () => {
    expect(() => createPlan(DEMO_USER.id, transferInput("2000000"))).toThrowError(ApiError);
    expect(getStore().listPlans(DEMO_USER.id)).toHaveLength(0);
  });
});
