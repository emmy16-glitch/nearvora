import { createHmac, timingSafeEqual } from "node:crypto";
import { fail, handleRoute, ok } from "@/lib/api/handler";
import { env } from "@/lib/config/env";
import { audit } from "@/lib/security/audit";
import { DEMO_USER } from "@/lib/database/seed-data";

export const dynamic = "force-dynamic";

/**
 * Generic provider webhook boundary. Signature verification is mandatory.
 * Live provider event processing is intentionally not implemented until a
 * provider is approved and its official signature scheme is verified.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  return handleRoute(async () => {
    const { provider } = await context.params;
    const secret = env.payments.webhookSecret;
    if (!secret) {
      return fail(
        503,
        "WEBHOOK_NOT_CONFIGURED",
        "Webhook verification is not configured. No event was processed.",
      );
    }

    const raw = await request.text();
    const signature =
      request.headers.get("x-nearvora-signature") ??
      request.headers.get("x-paystack-signature") ??
      "";
    const expected = createHmac("sha512", secret).update(raw).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return fail(401, "INVALID_SIGNATURE", "Webhook signature verification failed.");
    }

    audit({
      userId: DEMO_USER.id,
      action: "webhook.received",
      entity: "provider_event",
      entityId: provider,
      metadata: {
        provider,
        bytes: raw.length,
        processed: false,
        reason: "Live provider event processing is not configured.",
      },
    });

    return ok({
      received: true,
      processed: false,
      provider,
      note: "Signature verified. Live settlement processing is not configured, so no balance was changed.",
    });
  });
}
