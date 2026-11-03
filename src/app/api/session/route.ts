import { ApiError, handleRoute, ok } from "@/lib/api/handler";
import { DEMO_USER } from "@/lib/database/seed-data";
import { getStore } from "@/lib/database/store";
import { env } from "@/lib/config/env";
import { systemStatus } from "@/lib/config/system";
import {
  clearSessionCookie,
  getSession,
  setSessionCookie,
} from "@/lib/security/session";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    let session = await getSession();
    if (!session) {
      if (!env.demoMode) {
        throw new ApiError(401, "UNAUTHENTICATED", "Sign in to continue.");
      }
      session = await setSessionCookie(DEMO_USER.id);
    }
    const user = getStore().getUser(session.userId);
    if (!user) {
      await clearSessionCookie();
      throw new ApiError(401, "UNKNOWN_USER", "This demo user no longer exists.");
    }
    return ok({
      user,
      session: { demo: session.demo, issuedAt: session.issuedAt },
      system: systemStatus(),
    });
  });
}

export async function DELETE() {
  return handleRoute(async () => {
    await clearSessionCookie();
    return ok({ signedOut: true });
  });
}
