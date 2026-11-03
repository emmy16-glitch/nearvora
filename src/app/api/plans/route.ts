import {
  assertSameOrigin,
  handleRoute,
  ok,
  parseBody,
  requireSession,
  ApiError,
} from "@/lib/api/handler";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { createPlan } from "@/lib/services/transactions/plan-service";
import { createPlanSchema } from "@/lib/validation/schemas";
import { getStore } from "@/lib/database/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    const session = await requireSession();
    return ok(getStore().listPlans(session.userId), { simulated: true });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    const limit = rateLimit(clientKey(request, "plans:create"), 20);
    if (!limit.allowed) {
      throw new ApiError(429, "RATE_LIMITED", "Too many plan requests. Try again shortly.");
    }
    const input = await parseBody(request, createPlanSchema);
    const plan = createPlan(session.userId, input);
    return ok(plan, { simulated: true }, { status: 201 });
  });
}
