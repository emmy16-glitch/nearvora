import { handleRoute, ok, requireSession } from "@/lib/api/handler";
import { env } from "@/lib/config/env";
import { isAiConfigured } from "@/lib/services/ai/ai-planner";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    await requireSession();
    const configured = isAiConfigured();
    return ok({
      configured,
      provider: "openai-compatible",
      model: configured ? env.ai.model : null,
      planner: configured ? "model" : "deterministic-development-planner",
      simulated: true,
      note: configured
        ? "Financial tools and approval remain enforced by the Nearvora backend."
        : "No AI model is connected. Requests use the labelled deterministic development planner.",
    });
  });
}
