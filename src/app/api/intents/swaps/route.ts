import {
  assertSameOrigin,
  handleRoute,
  ok,
  parseBody,
  requireSession,
  ApiError,
} from "@/lib/api/handler";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import type { AssetSymbol } from "@/lib/config/assets";
import {
  createLiveSwap,
  listLiveSwaps,
} from "@/lib/services/intents/live-swap-service";
import { createLiveSwapSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    const session = await requireSession();
    return ok(listLiveSwaps(session.userId), { simulated: false, provider: "1click" });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    const limit = rateLimit(clientKey(request, "intents:swap"), 15);
    if (!limit.allowed) {
      throw new ApiError(429, "RATE_LIMITED", "Too many live swap requests. Try again shortly.");
    }
    const input = await parseBody(request, createLiveSwapSchema);
    const swap = await createLiveSwap(session.userId, {
      ...input,
      from: input.from as AssetSymbol,
      to: input.to as AssetSymbol,
    });
    return ok(swap, { simulated: false, provider: "1click" }, { status: 201 });
  });
}
