import { handleRoute, ok, requireSession } from "@/lib/api/handler";
import { refreshLiveSwap } from "@/lib/services/intents/live-swap-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const session = await requireSession();
    const { id } = await context.params;
    const swap = await refreshLiveSwap(session.userId, id);
    return ok(swap, { simulated: false, provider: "1click" });
  });
}
