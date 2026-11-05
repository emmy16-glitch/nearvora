import {
  assertSameOrigin,
  handleRoute,
  ok,
  parseBody,
  requireSession,
  ApiError,
} from "@/lib/api/handler";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { submitLiveSwapDeposit } from "@/lib/services/intents/live-swap-service";
import { liveSwapDepositSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    const limit = rateLimit(clientKey(request, "intents:deposit"), 30);
    if (!limit.allowed) {
      throw new ApiError(429, "RATE_LIMITED", "Too many deposit updates. Try again shortly.");
    }
    const { id } = await context.params;
    const input = await parseBody(request, liveSwapDepositSchema);
    const swap = await submitLiveSwapDeposit(session.userId, id, input.txHash);
    return ok(swap, { simulated: false, provider: "1click" });
  });
}
