import { handleRoute, ok, requireSession } from "@/lib/api/handler";
import { getStore } from "@/lib/database/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    const session = await requireSession();
    const bills = getStore()
      .listBills(session.userId)
      .map((bill) => ({
        ...bill,
        displayName: `${bill.provider} · ${bill.nickname}`,
      }));
    return ok(bills, { simulated: true });
  });
}
