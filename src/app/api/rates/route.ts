import { handleRoute, ok } from "@/lib/api/handler";
import { getRates } from "@/lib/services/rates";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    const snapshot = getRates();
    return ok(snapshot, { simulated: true });
  });
}
