import { ok } from "@/lib/api/handler";
import { env } from "@/lib/config/env";
import { systemStatus } from "@/lib/config/system";
import { getStore } from "@/lib/database/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const system = systemStatus();
  return ok({
    status: system.liveReady ? "ok" : env.demoMode ? "ok" : "degraded",
    service: "nearvora",
    time: new Date().toISOString(),
    store: env.demoMode ? getStore().stats() : null,
    system,
  });
}
