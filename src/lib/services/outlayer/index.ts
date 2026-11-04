import Decimal from "decimal.js";
import { env } from "@/lib/config/env";
import type { ExecutionGuard, TransactionPlan } from "@/lib/types/domain";

export interface OutLayerPolicy {
  maxPerPlanNgn: string;
  maxDailyNgn: string;
  requireApproval: true;
  allowedRecipientMode: "any" | "saved_only";
}

export interface PolicyDecision {
  allowed: boolean;
  reasons: string[];
  policy: OutLayerPolicy;
}

export interface ProtectedExecution {
  simulated: boolean;
  verified: boolean;
  attestationId?: string;
  note: string;
}

/**
 * OutLayer is treated as the protected execution / wallet-policy layer. It is
 * not the AI model and it does not decide financial intent.
 *
 * The live adapter is intentionally not implemented: the official OutLayer API
 * contract and credentials are not available in this environment. We never
 * invent endpoints. See docs/integrations.md.
 */
export interface OutLayerAdapter {
  readonly name: string;
  readonly mode: "demo" | "live";
  evaluatePlan(plan: TransactionPlan): PolicyDecision;
  executePlan(plan: TransactionPlan): ProtectedExecution;
}

const DEMO_POLICY: OutLayerPolicy = {
  maxPerPlanNgn: "500000000",
  maxDailyNgn: "1000000000",
  requireApproval: true,
  allowedRecipientMode: "any",
};

class DemoOutLayerAdapter implements OutLayerAdapter {
  readonly name = "OutLayer demo policy engine";
  readonly mode = "demo" as const;

  evaluatePlan(plan: TransactionPlan): PolicyDecision {
    const reasons: string[] = [];
    if (!plan.requiresAcknowledgment && plan.riskLevel === "high") {
      reasons.push("High-risk plans must require acknowledgment.");
    }
    if (new Decimal(plan.totalNgn).gt(DEMO_POLICY.maxPerPlanNgn)) {
      reasons.push("Plan exceeds the demo per-plan limit.");
    }
    if (plan.operations.some((operation) => !operation.simulated)) {
      reasons.push("Mixed simulated/live operations are not permitted by the demo policy.");
    }
    return { allowed: reasons.length === 0, reasons, policy: DEMO_POLICY };
  }

  executePlan(plan: TransactionPlan): ProtectedExecution {
    return {
      simulated: true,
      verified: false,
      note: `Demo policy engine evaluated ${plan.operations.length} operations. No OutLayer attestation was obtained.`,
    };
  }
}

class LiveOutLayerAdapter implements OutLayerAdapter {
  readonly name = "OutLayer live";
  readonly mode = "live" as const;

  evaluatePlan(): PolicyDecision {
    throw new Error(
      "OutLayer live execution is not configured. Consult official OutLayer documentation and credentials.",
    );
  }

  executePlan(): ProtectedExecution {
    throw new Error(
      "OutLayer live execution is not configured. Refusing to fabricate an attestation.",
    );
  }
}

export function getOutLayerAdapter(): OutLayerAdapter {
  if (!env.demoMode) {
    // LIVE mode must fail closed. A missing live adapter is never replaced by
    // the deterministic demo policy engine.
    return new LiveOutLayerAdapter();
  }
  if (env.near.outlayerUrl && env.near.outlayerKey) {
    return new LiveOutLayerAdapter();
  }
  return new DemoOutLayerAdapter();
}

export function toExecutionGuard(execution: ProtectedExecution): ExecutionGuard {
  return {
    provider: "OutLayer",
    mode: execution.simulated ? "demo" : "live",
    verified: execution.verified,
    simulated: execution.simulated,
    attestationId: execution.attestationId,
    note: execution.note,
  };
}
