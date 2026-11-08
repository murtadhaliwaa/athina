import "server-only";

import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export async function findOpenShift(client: Db = prisma) {
  return client.shift.findFirst({
    where: { closedAt: null },
    orderBy: { openedAt: "desc" },
    select: {
      id: true,
      openedAt: true,
      openedById: true,
      openingCash: true,
      closedAt: true,
    },
  });
}

/** نسخة مخزّنة لكل طلب RSC — تمنع تكرار نفس الاستعلام بين layout والصفحة */
export const getOpenShiftCached = cache(async () => findOpenShift());
