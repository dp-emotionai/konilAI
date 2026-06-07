import { prisma } from "./db";

export async function logAudit(
  actorId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  meta?: string | null
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId: entityId ?? null,
        meta: meta ?? null,
      },
    });
  } catch (e) {
    console.error("Audit log write failed", e);
  }
}
