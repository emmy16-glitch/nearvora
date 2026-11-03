import { getStore, createId } from "@/lib/database/store";

export function audit(input: {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}): void {
  getStore().addAuditLog({
    id: createId("audit"),
    userId: input.userId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    metadata: input.metadata ?? {},
    ip: input.ip,
    createdAt: new Date().toISOString(),
  });
}
