import {
  ApiError,
  handleRoute,
  ok,
  requireSession,
} from "@/lib/api/handler";
import { env } from "@/lib/config/env";
import { checkAiHealth } from "@/lib/ai/health";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Operational health check for Nearvora AI. It never returns credentials or
 * model identifiers. `?probe=1` performs a tiny live completion, requires an
 * authenticated session and is rate limited so it cannot be used to burn the
 * development AI credit anonymously.
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const { searchParams } = new URL(request.url);
    const probe = searchParams.get("probe") === "1";

    if (probe) {
      await requireSession();
    }

    const limit = rateLimit(
      clientKey(request, probe ? "ai:health:probe" : "ai:health"),
      probe ? 2 : 30,
    );
    if (!limit.allowed) {
      throw new ApiError(429, "RATE_LIMITED", "Too many AI health checks. Try again shortly.");
    }

    const report = await checkAiHealth({ probe });
    return ok(report, { simulated: env.demoMode });
  });
}
