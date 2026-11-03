import { assertSameOrigin, handleRoute, ok, requireSession } from "@/lib/api/handler";
import { cancelPlan } from "@/lib/services/transactions/plan-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    const { id } = await context.params;
    return ok(cancelPlan(session.userId, id));
  });
}
