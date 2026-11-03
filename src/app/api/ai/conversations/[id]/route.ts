import { ApiError, handleRoute, ok, requireSession } from "@/lib/api/handler";
import { getStore } from "@/lib/database/store";
import { getPlanForUser } from "@/lib/services/transactions/plan-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const session = await requireSession();
    const { id } = await context.params;
    const store = getStore();
    const conversation = store.getConversation(id);
    if (!conversation || conversation.userId !== session.userId) {
      throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
    }
    const messages = store.listMessages(id, 200);
    const plans = messages
      .map((message) => message.planId)
      .filter((planId): planId is string => Boolean(planId))
      .map((planId) => {
        try {
          return getPlanForUser(session.userId, planId);
        } catch {
          return null;
        }
      })
      .filter((plan): plan is NonNullable<typeof plan> => Boolean(plan));
    return ok({ conversation, messages, plans }, { simulated: true });
  });
}
