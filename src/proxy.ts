import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/config/env";

const LIVE_BLOCKED_MESSAGE =
  "Transaction APIs are disabled by default in production. Nearvora blocks in-memory demo data and money movement until production authentication, durable storage, regulatory approvals and provider controls are implemented and reviewed.";

export function proxy(request: NextRequest) {
  if (env.demoMode) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/health")) {
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
