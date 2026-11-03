import {
  assertSameOrigin,
  handleRoute,
  ok,
  parseBody,
  requireSession,
  ApiError,
} from "@/lib/api/handler";
import { getStore } from "@/lib/database/store";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { handleChat } from "@/lib/services/ai/chat-service";
import { chatSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    const limit = rateLimit(clientKey(request, "ai:chat"), 15);
    if (!limit.allowed) {
      throw new ApiError(429, "RATE_LIMITED", "Too many assistant messages. Try again shortly.");
    }
    const input = await parseBody(request, chatSchema);
    const user = getStore().getUser(session.userId);
    if (!user) throw new ApiError(401, "UNKNOWN_USER", "Session user not found.");
    const result = await handleChat({
      user,
      conversationId: input.conversationId,
      message: input.message,
    });
    return ok(result, { simulated: true });
  });
}
