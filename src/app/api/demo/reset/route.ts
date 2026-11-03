import {
  assertDemoWrite,
  assertSameOrigin,
  handleRoute,
  ok,
  requireSession,
} from "@/lib/api/handler";
import { getStore } from "@/lib/database/store";
import { audit } from "@/lib/security/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request);
    assertDemoWrite();
    const session = await requireSession();
    getStore().seed();
    audit({
      userId: session.userId,
      action: "demo.reset",
      entity: "system",
      entityId: "nearvora",
      metadata: { simulated: true },
    });
    return ok({ reset: true, note: "Demo data was reset to its seeded state." });
  });
}
