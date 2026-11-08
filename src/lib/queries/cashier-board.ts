import "server-only";

import { prisma } from "@/lib/prisma";
import { parseBusinessDate } from "@/lib/date-db";
import { getCafeSettings } from "@/lib/queries/settings";
import { getBusinessDate } from "@/lib/time";
import type { BoardOrder } from "@/types/orders";

export const cashierOrderSelect = {
  id: true,
  dailyNumber: true,
  status: true,
  type: true,
  isFollowUp: true,
  cancelRequestedAt: true,
  createdAt: true,
  billId: true,
  table: { select: { label: true } },
  createdBy: { select: { fullName: true } },
  items: {
    where: { status: "ACTIVE" as const },
    select: {
      id: true,
      nameSnapshot: true,
      categorySnapshot: true,
      quantity: true,
      note: true,
    },
  },
} as const;

function mapBoardOrders(
  rows: Awaited<ReturnType<typeof loadCashierBoardRows>>,
): BoardOrder[] {
  const seen = new Set<string>();
  return rows
    .filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    })
    .map((o) => ({
      id: o.id,
      dailyNumber: o.dailyNumber,
      status: o.status,
      type: o.type,
      isFollowUp: o.isFollowUp,
      cancelRequestedAt: o.cancelRequestedAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
      tableLabel: o.table?.label ?? null,
      createdByName: o.createdBy.fullName,
      billId: o.billId,
      items: o.items.map((it) => ({
        id: it.id,
        nameSnapshot: it.nameSnapshot,
        categorySnapshot: it.categorySnapshot,
        quantity: it.quantity,
        note: it.note,
      })),
    }));
}

async function loadCashierBoardRows() {
  const settings = await getCafeSettings();
  const businessDate = getBusinessDate(
    new Date(),
    settings?.businessDayStartHour ?? 5,
  );
  const date = parseBusinessDate(businessDate);
  const servedSince = new Date(Date.now() - 2 * 60 * 60_000);

  const [liveOrders, servedOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          {
            businessDate: date,
            status: { in: ["NEW", "PREPARING", "READY"] },
          },
          {
            status: { in: ["NEW", "PREPARING", "READY"] },
            bill: { status: "OPEN" },
            businessDate: { lt: date },
          },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: cashierOrderSelect,
    }),
    prisma.order.findMany({
      where: {
        status: "SERVED",
        servedAt: { gte: servedSince },
      },
      orderBy: { servedAt: "desc" },
      take: 40,
      select: cashierOrderSelect,
    }),
  ]);

  return [...liveOrders, ...servedOrders];
}

/** لوحة الكاشير — استعلام مركّز بدون تصيير الصفحة */
export async function getCashierBoardOrders(): Promise<BoardOrder[]> {
  return mapBoardOrders(await loadCashierBoardRows());
}
