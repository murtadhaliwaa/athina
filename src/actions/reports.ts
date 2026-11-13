"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guard";
import { businessDateToIso, parseBusinessDate } from "@/lib/date-db";
import { getBusinessDate, getBaghdadHour } from "@/lib/time";
import { t } from "@/lib/i18n/ar-iq";
import {
  baghdadDayEnd,
  baghdadDayStart,
  resolveReportRange,
  type ReportPreset,
} from "@/lib/reports/date-range";

const presetSchema = z.enum(["today", "yesterday", "last7", "thisMonth", "custom"]);

const rangeSchema = z.object({
  preset: presetSchema,
  from: z.string().optional(),
  to: z.string().optional(),
});

export type ReportRangeInput = z.infer<typeof rangeSchema>;

async function getStartHour(): Promise<number> {
  const s = await prisma.cafeSettings.findUnique({ where: { id: 1 } });
  return s?.businessDayStartHour ?? 5;
}

async function resolveRange(input: ReportRangeInput) {
  await requireUser(["OWNER"]);
  const parsed = rangeSchema.safeParse(input);
  if (!parsed.success) {
    const startHour = await getStartHour();
    return resolveReportRange("today", undefined, undefined, startHour);
  }
  const startHour = await getStartHour();
  return resolveReportRange(
    parsed.data.preset,
    parsed.data.from,
    parsed.data.to,
    startHour
  );
}

function paidBillDateWhere(from: string, to: string) {
  return {
    status: "PAID" as const,
    businessDate: {
      gte: parseBusinessDate(from),
      lte: parseBusinessDate(to),
    },
  };
}

export async function getDashboardKpis(input?: ReportRangeInput) {
  await requireUser(["OWNER"]);
  const startHour = await getStartHour();
  const today = getBusinessDate(new Date(), startHour);
  const parsed = rangeSchema.safeParse(input ?? { preset: "today" });
  const preset = parsed.success ? parsed.data.preset : "today";
  const range = resolveReportRange(
    preset,
    parsed.success ? parsed.data.from : undefined,
    parsed.success ? parsed.data.to : undefined,
    startHour
  );
  const paidWhere = paidBillDateWhere(range.from, range.to);

  const [
    agg,
    discountCount,
    openBills,
    shift,
    lastClosedShift,
    soldOutCount,
    topItems,
    paidBills,
  ] = await Promise.all([
    prisma.bill.aggregate({
      where: paidWhere,
      _sum: { total: true, discountAmount: true },
      _count: true,
      _avg: { total: true },
    }),
    prisma.bill.count({
      where: { ...paidWhere, discountAmount: { gt: 0 } },
    }),
    prisma.bill.count({ where: { status: "OPEN" } }),
    prisma.shift.findFirst({
      where: { closedAt: null },
      orderBy: { openedAt: "desc" },
      select: {
        id: true,
        openedAt: true,
        openedBy: { select: { fullName: true } },
      },
    }),
    prisma.shift.findFirst({
      where: { closedAt: { not: null } },
      orderBy: { closedAt: "desc" },
      select: { difference: true, closedAt: true },
    }),
    prisma.menuItem.count({ where: { isAvailable: false } }),
    prisma.orderItem.groupBy({
      by: ["nameSnapshot"],
      where: {
        status: "ACTIVE",
        order: { bill: paidWhere },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.bill.findMany({
      where: paidWhere,
      select: { total: true, paidAt: true },
      orderBy: { paidAt: "asc" },
      take: 2000,
    }),
  ]);

  const rangeStart = baghdadDayStart(range.from);
  const rangeEnd = baghdadDayEnd(range.to);

  const [cancelledItems, cancelledOrders] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        status: "CANCELLED",
        cancelledAt: { gte: rangeStart, lte: rangeEnd },
      },
      select: { priceSnapshot: true, quantity: true },
    }),
    prisma.order.count({
      where: {
        status: "CANCELLED",
        cancelledAt: { gte: rangeStart, lte: rangeEnd },
      },
    }),
  ]);

  const cancelValue = cancelledItems.reduce(
    (s, i) => s + i.priceSnapshot * i.quantity,
    0
  );

  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0 }));
  for (const b of paidBills) {
    if (!b.paidAt) continue;
    const h = getBaghdadHour(b.paidAt);
    hourly[h]!.total += b.total;
  }

  const salesTotal = agg._sum.total ?? 0;
  const billCount = agg._count;
  const avgBill = billCount > 0 ? Math.round(agg._avg.total ?? 0) : 0;

  return {
    businessDate: today,
    preset,
    rangeFrom: range.from,
    rangeTo: range.to,
    salesTotal,
    billCount,
    avgBill,
    discountTotal: agg._sum.discountAmount ?? 0,
    discountCount,
    cancellationCount: cancelledOrders + cancelledItems.length,
    cancellationValue: cancelValue,
    openBills,
    shiftOpen: Boolean(shift),
    shiftOpenedAt: shift?.openedAt ?? null,
    shiftCashierName: shift?.openedBy.fullName ?? null,
    lastShiftDifference: lastClosedShift?.difference ?? null,
    soldOutCount,
    topItems: topItems.map((r) => ({
      name: r.nameSnapshot,
      quantity: r._sum.quantity ?? 0,
    })),
    hourlySales: hourly,
  };
}

export async function getDailySalesReport(input: ReportRangeInput) {
  const { from, to } = await resolveRange(input);
  const bills = await prisma.bill.groupBy({
    by: ["businessDate"],
    where: paidBillDateWhere(from, to),
    _sum: { subtotal: true, discountAmount: true, total: true },
    _count: true,
    orderBy: { businessDate: "asc" },
  });

  return bills.map((b) => ({
    date: businessDateToIso(b.businessDate),
    billCount: b._count,
    subtotal: b._sum.subtotal ?? 0,
    discounts: b._sum.discountAmount ?? 0,
    net: b._sum.total ?? 0,
  }));
}

export async function getWaiterSalesReport(input: ReportRangeInput) {
  const { from, to } = await resolveRange(input);
  const items = await prisma.orderItem.findMany({
    where: {
      status: "ACTIVE",
      order: { bill: paidBillDateWhere(from, to) },
    },
    select: {
      addedById: true,
      priceSnapshot: true,
      quantity: true,
      addedBy: { select: { fullName: true, role: true } },
    },
  });

  const map = new Map<
    string,
    { fullName: string; role: string; itemCount: number; sales: number }
  >();
  for (const item of items) {
    const cur = map.get(item.addedById) ?? {
      fullName: item.addedBy.fullName,
      role: item.addedBy.role,
      itemCount: 0,
      sales: 0,
    };
    cur.itemCount += item.quantity;
    cur.sales += item.priceSnapshot * item.quantity;
    map.set(item.addedById, cur);
  }

  return [...map.entries()]
    .map(([id, v]) => ({ staffId: id, ...v }))
    .sort((a, b) => b.sales - a.sales);
}

export async function getItemsReport(input: ReportRangeInput & { categoryId?: string }) {
  const { from, to } = await resolveRange(input);
  const items = await prisma.orderItem.findMany({
    where: {
      status: "ACTIVE",
      order: { bill: paidBillDateWhere(from, to) },
      ...(input.categoryId
        ? { menuItem: { categoryId: input.categoryId } }
        : {}),
    },
    select: {
      menuItemId: true,
      nameSnapshot: true,
      priceSnapshot: true,
      quantity: true,
      menuItem: { select: { category: { select: { name: true } } } },
    },
  });

  const map = new Map<
    string,
    { name: string; category: string; quantity: number; revenue: number }
  >();
  for (const item of items) {
    const cur = map.get(item.menuItemId) ?? {
      name: item.nameSnapshot,
      category: item.menuItem.category.name,
      quantity: 0,
      revenue: 0,
    };
    cur.quantity += item.quantity;
    cur.revenue += item.priceSnapshot * item.quantity;
    map.set(item.menuItemId, cur);
  }

  return [...map.values()].sort((a, b) => b.quantity - a.quantity);
}

export async function getDiscountsReport(input: ReportRangeInput) {
  const { from, to } = await resolveRange(input);
  const bills = await prisma.bill.findMany({
    where: {
      ...paidBillDateWhere(from, to),
      discountAmount: { gt: 0 },
    },
    include: { table: true },
    orderBy: { paidAt: "desc" },
  });

  const cashierIds = [
    ...new Set(bills.map((b) => b.discountById).filter((id): id is string => Boolean(id))),
  ];
  const cashiers =
    cashierIds.length > 0
      ? await prisma.profile.findMany({
          where: { id: { in: cashierIds } },
          select: { id: true, fullName: true },
        })
      : [];
  const cashierMap = new Map(cashiers.map((c) => [c.id, c.fullName]));

  return bills.map((b) => ({
    billId: b.id,
    tableLabel: b.table?.label ?? null,
    discountAmount: b.discountAmount,
    discountType: b.discountType,
    discountValue: b.discountValue,
    reason: b.discountReason,
    cashierName: b.discountById ? (cashierMap.get(b.discountById) ?? null) : null,
    paidAt: b.paidAt,
  }));
}

export async function getCancellationsReport(input: ReportRangeInput) {
  const { from, to } = await resolveRange(input);
  const start = baghdadDayStart(from);
  const end = baghdadDayEnd(to);

  const [orders, orderItems] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: "CANCELLED",
        cancelledAt: { gte: start, lte: end },
      },
      include: { table: true },
      orderBy: { cancelledAt: "desc" },
    }),
    prisma.orderItem.findMany({
      where: {
        status: "CANCELLED",
        cancelledAt: { gte: start, lte: end },
      },
      include: {
        order: {
          select: {
            dailyNumber: true,
            status: true,
            table: { select: { label: true } },
          },
        },
      },
      orderBy: { cancelledAt: "desc" },
    }),
  ]);

  const cancellerIds = [
    ...new Set([
      ...orders.map((o) => o.cancelledById),
      ...orderItems.map((i) => i.cancelledById),
    ].filter((id): id is string => Boolean(id))),
  ];
  const cancellers =
    cancellerIds.length > 0
      ? await prisma.profile.findMany({
          where: { id: { in: cancellerIds } },
          select: { id: true, fullName: true },
        })
      : [];
  const cancellerMap = new Map(cancellers.map((p) => [p.id, p.fullName]));

  const rows: {
    kind: "order" | "item";
    label: string;
    value: number;
    by: string | null;
    reason: string | null;
    at: Date | null;
    orderStatus: string | null;
  }[] = [];

  for (const o of orders) {
    rows.push({
      kind: "order",
      label: `#${String(o.dailyNumber).padStart(3, "0")} — ${o.table?.label ?? t("tables.unlabeled")}`,
      value: 0,
      by: o.cancelledById ? (cancellerMap.get(o.cancelledById) ?? null) : null,
      reason: o.cancelReason,
      at: o.cancelledAt,
      orderStatus: o.status,
    });
  }

  for (const i of orderItems) {
    rows.push({
      kind: "item",
      label: `${i.nameSnapshot} × ${i.quantity} — #${String(i.order.dailyNumber).padStart(3, "0")}`,
      value: i.priceSnapshot * i.quantity,
      by: i.cancelledById ? (cancellerMap.get(i.cancelledById) ?? null) : null,
      reason: i.cancelReason,
      at: i.cancelledAt,
      orderStatus: i.order.status,
    });
  }

  rows.sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
  return rows;
}

export async function getShiftsReport(input: ReportRangeInput) {
  const { from, to } = await resolveRange(input);
  const start = baghdadDayStart(from);
  const end = baghdadDayEnd(to);

  const shifts = await prisma.shift.findMany({
    where: {
      closedAt: { not: null, gte: start, lte: end },
    },
    include: { openedBy: { select: { fullName: true } } },
    orderBy: { closedAt: "desc" },
  });

  return shifts.map((s) => ({
    id: s.id,
    openedBy: s.openedBy.fullName,
    openedAt: s.openedAt,
    closedAt: s.closedAt,
    openingCash: s.openingCash,
    expectedCash: s.expectedCash,
    countedCash: s.countedCash,
    difference: s.difference,
    note: s.note,
  }));
}

export async function getVoidedBillsReport(input: ReportRangeInput) {
  const { from, to } = await resolveRange(input);
  const start = baghdadDayStart(from);
  const end = baghdadDayEnd(to);

  const bills = await prisma.bill.findMany({
    where: {
      status: "VOID",
      voidedAt: { gte: start, lte: end },
    },
    include: { table: true },
    orderBy: { voidedAt: "desc" },
  });

  const voiderIds = [
    ...new Set(bills.map((b) => b.voidedById).filter((id): id is string => Boolean(id))),
  ];
  const voiders =
    voiderIds.length > 0
      ? await prisma.profile.findMany({
          where: { id: { in: voiderIds } },
          select: { id: true, fullName: true },
        })
      : [];
  const voiderMap = new Map(voiders.map((p) => [p.id, p.fullName]));

  return bills.map((b) => ({
    billId: b.id,
    tableLabel: b.table?.label ?? null,
    total: b.total,
    reason: b.voidReason,
    voidedBy: b.voidedById ? (voiderMap.get(b.voidedById) ?? null) : null,
    voidedAt: b.voidedAt,
  }));
}

const auditSchema = rangeSchema.extend({
  actorId: z.string().uuid().optional(),
  entityType: z.string().trim().max(40).optional(),
  action: z.string().trim().max(80).optional(),
});

export async function getAuditLogs(input: z.infer<typeof auditSchema>) {
  await requireUser(["OWNER"]);
  const parsed = auditSchema.safeParse(input);
  const startHour = await getStartHour();
  const range = parsed.success
    ? resolveReportRange(
        parsed.data.preset,
        parsed.data.from,
        parsed.data.to,
        startHour
      )
    : resolveReportRange("today", undefined, undefined, startHour);

  const filters = parsed.success ? parsed.data : { preset: "today" as ReportPreset };

  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: baghdadDayStart(range.from),
        lte: baghdadDayEnd(range.to),
      },
      ...(filters.actorId ? { actorId: filters.actorId } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.action ? { action: filters.action } : {}),
    },
    include: { actor: { select: { fullName: true, username: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    reason: l.reason,
    actorName: l.actor.fullName,
    createdAt: l.createdAt,
  }));
}

export async function listStaffForAuditFilter() {
  await requireUser(["OWNER"]);
  return prisma.profile.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
}
