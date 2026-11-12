import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { nextDailyNumber } from "@/lib/orders/daily-number";
import { parseBusinessDate } from "@/lib/date-db";
import { recalcOpenBillOrThrow } from "@/lib/billing/recalc-bill";
import {
  clampWaterQty,
  DEFAULT_WATER_QTY,
  WATER_ITEM_NAME,
} from "@/lib/billing/water-constants";
import { t } from "@/lib/i18n/ar-iq";

export {
  clampWaterQty,
  DEFAULT_WATER_QTY,
  WATER_ITEM_NAME,
  isWaterItemName,
} from "@/lib/billing/water-constants";

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

type EnsureOpts = {
  billId: string;
  orderId: string;
  actorId: string;
  guestCount?: number | null;
};

/**
 * يضيف ماء افتراضي لأول طلب على الفاتورة إن لم يوجد ماء نشط.
 * لا يعيد الإضافة إذا حُذف الماء لاحقاً (يُستدعى فقط مع الطلب الأول).
 */
export async function ensureDefaultWaterOnOrder(
  tx: Prisma.TransactionClient,
  opts: EnsureOpts,
) {
  const water = await findWaterMenuItem(tx);
  if (!water || !water.isAvailable) return null;

  const existingQty = await countActiveWaterOnBill(tx, opts.billId, water.id);
  if (existingQty > 0) return null;

  const qty = clampWaterQty(DEFAULT_WATER_QTY, opts.guestCount ?? null);
  if (qty <= 0) return null;

  await tx.orderItem.create({
    data: {
      orderId: opts.orderId,
      menuItemId: water.id,
      nameSnapshot: water.name,
      categorySnapshot: water.category.name,
      priceSnapshot: water.price,
      quantity: qty,
      note: t("bill.waterDefaultNote"),
      addedById: opts.actorId,
    },
  });

  return { waterQty: qty, waterPrice: water.price, waterMenuItemId: water.id };
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
 * يثبت كمية الماء على الفاتورة:
 * يلغي سطور الماء النشطة ثم يضيف الكمية المطلوبة فقط (0 = حذف الكل).
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
    select: { id: true, orderId: true, quantity: true },
    orderBy: { createdAt: "asc" },
  });

  // مسار سريع: سطر ماء واحد — حدّث الكمية أو ألغِه بدون طلب جديد
  if (existing.length === 1) {
    const only = existing[0]!;
    if (waterQty === 0) {
      await tx.orderItem.update({
        where: { id: only.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: opts.actorId,
          cancelReason: t("bill.waterSettleNote"),
        },
      });
      const activeLeft = await tx.orderItem.count({
        where: { orderId: only.orderId, status: "ACTIVE" },
      });
      if (activeLeft === 0) {
        await tx.order.updateMany({
          where: {
            id: only.orderId,
            status: { not: "CANCELLED" },
          },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelledById: opts.actorId,
            cancelReason: t("bill.waterSettleNote"),
          },
        });
      }
    } else if (only.quantity !== waterQty) {
      await tx.orderItem.update({
        where: { id: only.id },
        data: { quantity: waterQty },
      });
    }
  } else if (existing.length > 1) {
    await tx.orderItem.updateMany({
      where: { id: { in: existing.map((i) => i.id) } },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: opts.actorId,
        cancelReason: t("bill.waterSettleNote"),
      },
    });
    if (waterQty > 0) {
      await addWaterOrder(tx, opts, water, waterQty);
    }
  } else if (waterQty > 0) {
    // لا ماء نشط — أضفه على آخر طلب مفتوح إن وُجد، وإلا طلب ماء منفصل
    const host = await tx.order.findFirst({
      where: { billId: opts.billId, status: { not: "CANCELLED" } },
      orderBy: { dailyNumber: "desc" },
      select: { id: true },
    });
    if (host) {
      await tx.orderItem.create({
        data: {
          orderId: host.id,
          menuItemId: water.id,
          nameSnapshot: water.name,
          categorySnapshot: water.category.name,
          priceSnapshot: water.price,
          quantity: waterQty,
          note: t("bill.waterSettleNote"),
          addedById: opts.actorId,
        },
      });
    } else {
      await addWaterOrder(tx, opts, water, waterQty);
    }
  }

  const totals = await recalcOpenBillOrThrow(tx, opts.billId);
  return {
    waterQty,
    waterPrice: water.price,
    waterMenuItemId: water.id,
    ...totals,
  };
}

async function addWaterOrder(
  tx: Prisma.TransactionClient,
  opts: SyncOpts,
  water: {
    id: string;
    name: string;
    price: number;
    category: { name: string };
  },
  waterQty: number,
) {
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
