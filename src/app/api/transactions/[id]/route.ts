import { ApiError, handleRoute, ok, requireSession } from "@/lib/api/handler";
import { getStore } from "@/lib/database/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const session = await requireSession();
    const { id } = await context.params;
    const transaction = getStore().getTransaction(id);
    if (!transaction || transaction.userId !== session.userId) {
      throw new ApiError(404, "TRANSACTION_NOT_FOUND", "Transaction not found.");
    }
    return ok(transaction);
  });
}
