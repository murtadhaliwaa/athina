import { BillsList, type OpenBillCard } from "@/components/cashier/bills-list";
import { getCurrentProfile } from "@/lib/auth/guard";
import { areBillOrdersReady } from "@/lib/orders/bill-ready";
import { getOpenShiftCached } from "@/lib/shifts/helpers";
import { prisma } from "@/lib/prisma";

export default async function CashierBillsPage() {
  const [profile, shift, bills] = await Promise.all([
    getCurrentProfile(),
    getOpenShiftCached(),
    prisma.bill.findMany({
      where: { status: "OPEN" },
      orderBy: { openedAt: "asc" },
      take: 80,
      select: {
        id: true,
        total: true,
        openedAt: true,
        table: { select: { label: true } },
        orders: {
          where: { status: { not: "CANCELLED" } },
          select: { status: true },
        },
      },
    }),
  ]);

  const cards: OpenBillCard[] = bills.map((b) => {
    const active = b.orders;
    return {
      id: b.id,
      total: b.total,
      openedAt: b.openedAt.toISOString(),
      tableLabel: b.table?.label ?? null,
      ordersCount: active.length,
      allReady: areBillOrdersReady(active.map((o) => o.status)),
    };
  });

  return (
    <BillsList
      bills={cards}
      cashierName={profile?.fullName ?? "—"}
      shiftOpen={Boolean(shift)}
    />
  );
}
