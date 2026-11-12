import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { nextDailyNumber } from "@/lib/orders/daily-number";
import { parseBusinessDate } from "@/lib/date-db";
import { recalcOpenBillOrThrow } from "@/lib/billing/recalc-bill";
import { t } from "@/lib/i18n/ar-iq";

/** اسم صنف الماء في المنيو — يجب أن يطابق البذرة/المنيو */
export const WATER_ITEM_NAME = "ماء";

export function clampWaterQty(qty: number, guestCount: number | null | undefined) {
  const max =
    typeof guestCount === "number" && guestCount > 0 ? guestCount : 50;
  if (!Number.isFinite(qty)) return 0;
  return Math.max(0, Math.min(max, Math.floor(qty)));
}

export async function findWaterMenuItem(
  tx: Pick<Prisma.TransactionClient, "menuItem">,
) {
  return tx.menuItem.findFirst({
    where: {
      name: WATER_ITEM_NAME,
      isActive: true,
      category: { isActive: true },
    },
    select: {
      id: true,
      name: true,
      price: true,
      isAvailable: true,
      category: { select: { name: true } },
    },
  });
}

export async function countActiveWaterOnBill(
  tx: Pick<Prisma.TransactionClient, "orderItem">,
  billId: string,
  waterMenuItemId: string,
) {
  const agg = await tx.orderItem.aggregate({
    where: {
      menuItemId: waterMenuItemId,
      status: "ACTIVE",
      order: { billId, status: { not: "CANCELLED" } },
    },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

type SyncOpts = {
  billId: string;
  tableId: string | null;
  waterQty: number;
  actorId: string;
  shiftId: string;
  businessDate: string;
  guestCount: number | null;
};

/**
 * يثبت كمية الماء المحاسب عليها عند الدفع:
 * يلغي سطور الماء النشطة ثم يضيف الكمية المؤكدة فقط.
 */
export async function syncBillWater(
  tx: Prisma.TransactionClient,
  opts: SyncOpts,
) {
  const waterQty = clampWaterQty(opts.waterQty, opts.guestCount);
  const water = await findWaterMenuItem(tx);
  if (!water) {
    throw new AppError("VALIDATION", t("bill.waterItemMissing"));
  }
  if (waterQty > 0 && !water.isAvailable) {
    throw new AppError(
      "VALIDATION",
      t("error.itemSoldOutNamed", { name: water.name }),
    );
  }

  const existing = await tx.orderItem.findMany({
    where: {
      menuItemId: water.id,
      status: "ACTIVE",
      order: { billId: opts.billId, status: { not: "CANCELLED" } },
    },
    select: { id: true },
  });

  if (existing.length > 0) {
    await tx.orderItem.updateMany({
      where: { id: { in: existing.map((i) => i.id) } },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: opts.actorId,
        cancelReason: t("bill.waterSettleNote"),
      },
    });
  }

  if (waterQty > 0) {
    const dailyNumber = await nextDailyNumber(tx, opts.businessDate);
    const priorCount = await tx.order.count({
      where: { billId: opts.billId, status: { not: "CANCELLED" } },
    });

    await tx.order.create({
      data: {
        businessDate: parseBusinessDate(opts.businessDate),
        dailyNumber,
        billId: opts.billId,
        tableId: opts.tableId,
        type: "DINE_IN",
        shiftId: opts.shiftId,
        createdById: opts.actorId,
        isFollowUp: priorCount > 0,
        note: t("bill.waterSettleNote"),
        items: {
          create: {
            menuItemId: water.id,
            nameSnapshot: water.name,
            categorySnapshot: water.category.name,
            priceSnapshot: water.price,
            quantity: waterQty,
            note: t("bill.waterSettleNote"),
            addedById: opts.actorId,
          },
        },
      },
    });
  }

  const totals = await recalcOpenBillOrThrow(tx, opts.billId);
  return {
    waterQty,
    waterPrice: water.price,
    waterMenuItemId: water.id,
    ...totals,
  };
}
