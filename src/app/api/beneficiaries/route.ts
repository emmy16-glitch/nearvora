import {
  assertSameOrigin,
  handleRoute,
  ok,
  parseBody,
  requireSession,
  ApiError,
} from "@/lib/api/handler";
import { createId, getStore } from "@/lib/database/store";
import { audit } from "@/lib/security/audit";
import { beneficiarySchema } from "@/lib/validation/schemas";
import type { Beneficiary } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    const session = await requireSession();
    return ok(getStore().listBeneficiaries(session.userId), { simulated: true });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request);
    const session = await requireSession();
    const input = await parseBody(request, beneficiarySchema);
    const user = getStore().getUser(session.userId);
    if (!user) throw new ApiError(401, "UNKNOWN_USER", "Session user not found.");

    const beneficiary: Beneficiary = {
      id: createId("ben"),
      userId: session.userId,
      type: input.type,
      name: input.name,
      nickname: input.nickname,
      bankName: input.type === "bank" ? input.bankName : undefined,
      accountNumber: input.type === "bank" ? input.accountNumber : undefined,
      address: input.type === "crypto" ? input.address : undefined,
      network: input.type === "crypto" ? input.network : undefined,
      risk: "new",
      createdAt: new Date().toISOString(),
    };
    getStore().addBeneficiary(beneficiary);
    audit({
      userId: session.userId,
      action: "beneficiary.created",
      entity: "beneficiary",
      entityId: beneficiary.id,
      metadata: { type: beneficiary.type, simulated: true },
    });
    return ok(beneficiary, { simulated: true }, { status: 201 });
  });
}
