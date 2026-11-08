import "server-only";

import type { Prisma } from "@prisma/client";

export async function writeAudit(
  tx: Prisma.TransactionClient,
  data: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    reason?: string | null;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  }
) {
  await tx.auditLog.create({ data });
}
