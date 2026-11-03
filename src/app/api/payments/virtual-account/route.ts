import { ApiError, handleRoute, ok, requireSession } from "@/lib/api/handler";
import { getStore } from "@/lib/database/store";
import { getPaymentProvider } from "@/lib/services/payments";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    const session = await requireSession();
    const user = getStore().getUser(session.userId);
    if (!user) throw new ApiError(401, "UNKNOWN_USER", "Session user not found.");
    const account = await getPaymentProvider().createVirtualAccount(user);
    return ok(account, { simulated: true });
  });
}
