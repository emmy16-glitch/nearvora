import { handleRoute, ok, requireSession } from "@/lib/api/handler";
import { getStore } from "@/lib/database/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRoute(async () => {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const limitRaw = Number(searchParams.get("limit") ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;
    const transactions = getStore().listTransactions(session.userId, {
      status,
      type,
      limit,
    });
    return ok(transactions, { simulated: true, count: transactions.length });
  });
}
