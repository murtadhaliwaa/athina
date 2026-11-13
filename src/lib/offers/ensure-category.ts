import "server-only";

import type { Prisma } from "@prisma/client";
import { OFFERS_CATEGORY_NAME } from "@/lib/offers/constants";

export async function ensureOffersCategory(
  tx: Pick<Prisma.TransactionClient, "category">,
) {
  const existing = await tx.category.findFirst({
    where: { name: OFFERS_CATEGORY_NAME },
    select: { id: true },
  });
  if (existing) return existing.id;

  const max = await tx.category.aggregate({ _max: { sortOrder: true } });
  const created = await tx.category.create({
    data: {
      name: OFFERS_CATEGORY_NAME,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      isActive: true,
    },
    select: { id: true },
  });
  return created.id;
}

export function componentsDescription(labels: string[]) {
  return labels.map((l) => l.trim()).filter(Boolean).join(" · ") || null;
}
