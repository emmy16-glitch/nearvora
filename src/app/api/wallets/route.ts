import { handleRoute, ok, requireSession } from "@/lib/api/handler";
import { getPortfolio } from "@/lib/services/wallets/wallet-service";
import { systemStatus } from "@/lib/config/system";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    const session = await requireSession();
    const portfolio = getPortfolio(session.userId);
    return ok(portfolio, {
      simulated: true,
      demoMode: systemStatus().demoMode,
    });
  });
}
