import { handleRoute, ok, requireSession } from "@/lib/api/handler";
import { env } from "@/lib/config/env";
import { getAiProviderStatus } from "@/lib/ai/provider";
import { getUsageSnapshot } from "@/lib/ai/usage";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    const session = await requireSession();
    const status = getAiProviderStatus();
    return ok(
      {
        ...status,
        usage: getUsageSnapshot(session.userId),
        simulated: env.demoMode,
      },
      { simulated: env.demoMode },
    );
  });
}
