import "server-only";

import { prisma } from "@/lib/prisma";

export type WaiterTableCard = {
  id: string;
  label: string;
  state: "free" | "busy" | "ready" | "cancel";
  orderCount: number;
  total: number;
  readySince: string | null;
  href: string;
};

export async function getWaiterTableCards(): Promise<WaiterTableCard[]> {
  const [tables, openBills] = await Promise.all([
    prisma.cafeTable.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true },
    }),
    prisma.bill.findMany({
      where: { status: "OPEN", tableId: { not: null } },
      select: {
        id: true,
        tableId: true,
        total: true,
        orders: {
          where: { status: { not: "CANCELLED" } },
          select: {
            status: true,
            cancelRequestedAt: true,
            readyAt: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  const billByTable = new Map(openBills.map((b) => [b.tableId!, b]));

  return tables.map((table) => {
    const bill = billByTable.get(table.id);
    const orders = bill?.orders ?? [];
    const hasCancel = orders.some((o) => o.cancelRequestedAt);
    const readyOrders = orders.filter((o) => o.status === "READY");
    const hasReady = readyOrders.length > 0;
    const busy = orders.length > 0;

    let state: WaiterTableCard["state"] = "free";
    if (hasCancel) state = "cancel";
    else if (hasReady) state = "ready";
    else if (busy) state = "busy";

    const readySince =
      readyOrders
        .map((o) => o.readyAt ?? o.createdAt)
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

    return {
      id: table.id,
      label: table.label,
      state,
      orderCount: orders.length,
      total: bill?.total ?? 0,
      readySince: readySince?.toISOString() ?? null,
      href:
        busy || hasCancel
          ? `/waiter/table/${table.id}`
          : `/waiter/new?table=${table.id}`,
    };
  });
}
