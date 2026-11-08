import {
  HistoryList,
  type HistoryOrderCard,
  type HistoryPaidBillCard,
} from "@/components/cashier/history-list";
import { getCurrentProfile } from "@/lib/auth/guard";
import { getCafeSettings } from "@/lib/queries/settings";
import { getOpenShiftCached } from "@/lib/shifts/helpers";
import { prisma } from "@/lib/prisma";
import { parseBusinessDate } from "@/lib/date-db";
import { getBusinessDate } from "@/lib/time";

export default async function CashierHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [profile, shift, settings] = await Promise.all([
    getCurrentProfile(),
    getOpenShiftCached(),
    getCafeSettings(),
  ]);

  const businessDate = getBusinessDate(
    new Date(),
    settings?.businessDayStartHour ?? 5,
  );
  const date = parseBusinessDate(businessDate);

  const [ordersRaw, paidRaw] = await Promise.all([
    prisma.order.findMany({
      where: { businessDate: date },
      orderBy: { dailyNumber: "desc" },
      take: 100,
      select: {
        id: true,
        billId: true,
        dailyNumber: true,
        status: true,
        table: { select: { label: true } },
      },
    }),
    prisma.bill.findMany({
      where: {
        businessDate: date,
        status: "PAID",
      },
      orderBy: { paidAt: "desc" },
      take: 50,
      select: {
        id: true,
        total: true,
        table: { select: { label: true } },
      },
    }),
  ]);

  const orders: HistoryOrderCard[] = ordersRaw.map((o) => ({
    id: o.id,
    billId: o.billId,
    dailyNumber: o.dailyNumber,
    status: o.status,
    tableLabel: o.table?.label ?? null,
  }));

  const paidBills: HistoryPaidBillCard[] = paidRaw.map((b) => ({
    id: b.id,
    total: b.total,
    tableLabel: b.table?.label ?? null,
  }));

  return (
    <HistoryList
      orders={orders}
      paidBills={paidBills}
      cashierName={profile?.fullName ?? "—"}
      shiftOpen={Boolean(shift)}
      initialQuery={q ?? ""}
    />
  );
}
