"use server";

import { getCurrentProfile } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";

export type ReadyOrderBrief = {
  id: string;
  tableLabel: string | null;
};

/** جلب خفيف لحالة «جاهز» — بدون إعادة تصيير الصفحة كاملة */
export async function fetchWaiterReadyOrders(): Promise<{
  ok: true;
  mine: ReadyOrderBrief[];
  total: number;
} | { ok: false }> {
  const profile = await getCurrentProfile();
  if (!profile?.isActive) return { ok: false };
  if (profile.role !== "WAITER" && profile.role !== "OWNER") {
    return { ok: false };
  }

  const [mineRows, total] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: "READY",
        createdById: profile.id,
        bill: { status: "OPEN" },
      },
      select: {
        id: true,
        table: { select: { label: true } },
      },
      take: 40,
    }),
    prisma.order.count({
      where: { status: "READY", bill: { status: "OPEN" } },
    }),
  ]);

  return {
    ok: true,
    mine: mineRows.map((o) => ({
      id: o.id,
      tableLabel: o.table?.label ?? null,
    })),
    total,
  };
}
