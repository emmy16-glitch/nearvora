import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/config/env";

const LIVE_BLOCKED_MESSAGE =
  "LIVE mode is not available in this build. Nearvora refuses to serve in-memory demo balances, quotes or transactions as live data. Set DEMO_MODE=true, or implement and verify persistent storage and provider adapters first.";

export function proxy(request: NextRequest) {
  if (env.demoMode) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/health")) {
    return NextResponse.next();
  }
  // Live 1Click swaps use their own memory repository and do not depend on the
  // demo ledger. They still require a valid signed session.
  if (pathname.startsWith("/api/intents")) {
    return NextResponse.next();
  }

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "LIVE_RUNTIME_UNAVAILABLE",
        message: LIVE_BLOCKED_MESSAGE,
      },
    },
    { status: 503 },
  );
}

export const config = {
  matcher: ["/api/:path*"],
};
