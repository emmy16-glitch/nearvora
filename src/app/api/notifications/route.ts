import { assertSameOrigin, handleRoute, ok, requireSession } from "@/lib/api/handler";
import { getStore } from "@/lib/database/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    const session = await requireSession();
    return ok(getStore().listNotifications(session.userId));
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    getStore().markNotificationsRead(session.userId);
    return ok({ read: true });
  });
}
