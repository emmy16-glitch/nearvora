import {
  assertDemoWrite,
  assertSameOrigin,
  handleRoute,
  ok,
  parseBody,
  requireSession,
  ApiError,
} from "@/lib/api/handler";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { approveAndExecutePlan } from "@/lib/services/transactions/plan-service";
import { approvePlanSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    assertSameOrigin(request);
    assertDemoWrite();
    const session = await requireSession();
    const limit = rateLimit(clientKey(request, "plans:approve"), 10);
    if (!limit.allowed) {
      throw new ApiError(429, "RATE_LIMITED", "Too many approval attempts. Try again shortly.");
    }
    const { id } = await context.params;
    const input = await parseBody(request, approvePlanSchema);
    const result = approveAndExecutePlan(session.userId, id, {
      acknowledged: input.acknowledged,
      idempotencyKey: input.idempotencyKey,
      note: input.note,
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return ok(result, {
      simulated: true,
      note: "Demo execution. No real money moved.",
    });
  });
}
