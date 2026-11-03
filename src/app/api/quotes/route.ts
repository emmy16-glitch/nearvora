import {
  assertSameOrigin,
  handleRoute,
  ok,
  parseBody,
  requireSession,
  ApiError,
} from "@/lib/api/handler";
import { ASSETS, type AssetSymbol } from "@/lib/config/assets";
import { toMinor } from "@/lib/money/money";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { createQuote } from "@/lib/services/transactions/quote-service";
import { quoteRequestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    const limit = rateLimit(clientKey(request, "quotes"), 60);
    if (!limit.allowed) {
      throw new ApiError(429, "RATE_LIMITED", "Too many quote requests. Try again shortly.");
    }
    const input = await parseBody(request, quoteRequestSchema);
    const from = input.from as AssetSymbol;
    const to = input.to as AssetSymbol;
    const amount = toMinor(input.amount, ASSETS[from].decimals);
    const quote = createQuote(session.userId, {
      from,
      to,
      amount,
      side: input.side,
    });
    return ok(quote, { simulated: true });
  });
}
