import { handleRoute, ok, requireSession } from "@/lib/api/handler";
import { getPlanForUser } from "@/lib/services/transactions/plan-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const session = await requireSession();
    const { id } = await context.params;
    return ok(getPlanForUser(session.userId, id));
  });
}
