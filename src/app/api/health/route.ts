import { ok } from "@/lib/api/handler";
import { systemStatus } from "@/lib/config/system";
import { getStore } from "@/lib/database/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({
    status: "ok",
    service: "nearvora",
    time: new Date().toISOString(),
    store: getStore().stats(),
    system: systemStatus(),
  });
}
