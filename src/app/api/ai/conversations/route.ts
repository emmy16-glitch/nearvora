import { handleRoute, ok, requireSession } from "@/lib/api/handler";
import { getStore } from "@/lib/database/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    const session = await requireSession();
    const store = getStore();
    const conversations = store.listConversations(session.userId).map((conversation) => ({
      ...conversation,
      messageCount: store.listMessages(conversation.id, 200).length,
    }));
    return ok(conversations, { simulated: true });
  });
}
