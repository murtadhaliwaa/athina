"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertCan, requireUser } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/audit";
import { calcDiscount } from "@/lib/billing/calc";
import { lockOpenBill, lockOpenShift } from "@/lib/billing/lock-open-bill";
import {
  recalcBillTotals,
  recalcOpenBillOrThrow,
} from "@/lib/billing/recalc-bill";
import { findOpenShift } from "@/lib/shifts/helpers";
import { syncBillWater } from "@/lib/billing/water";
import { getBusinessDate } from "@/lib/time";
import { AppError, ok, fail, type ActionResult } from "@/lib/errors";
import { handleAction, iqdSchema, reasonSchema } from "@/actions/helpers";
import { t } from "@/lib/i18n/ar-iq";

/** Supabase البعيد أحياناً أبطأ من المهلة الافتراضية 5 ثوانٍ */
const TX = { maxWait: 10_000, timeout: 20_000 } as const;

function revalidateBillPaths(billId: string) {
  revalidatePath("/cashier/bills");
  revalidatePath(`/cashier/bills/${billId}`);
  revalidatePath("/cashier");
  revalidatePath("/waiter");
}

export async function applyDiscount(input: {
  billId: string;
  type: "AMOUNT" | "PERCENT";
  value: number;
  reason: string;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["CASHIER", "OWNER"]);
    assertCan(me.role, "bills.discount");
    const schema = z.object({
      billId: z.string().uuid(),
      type: z.enum(["AMOUNT", "PERCENT"]),
      value: z.number().int().min(1).max(1_000_000_000),
      reason: reasonSchema,
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      await lockOpenBill(tx, parsed.data.billId);

      const bill = await tx.bill.findUnique({
        where: { id: parsed.data.billId },
      });
      if (!bill || bill.status !== "OPEN") {
        throw new AppError("CONFLICT", t("bill.notOpen"));
      }

      const items = await tx.orderItem.findMany({
        where: {
          status: "ACTIVE",
          order: { billId: bill.id, status: { not: "CANCELLED" } },
        },
        select: { priceSnapshot: true, quantity: true },
      });
      const subtotal = items.reduce(
        (s, i) => s + i.priceSnapshot * i.quantity,
        0
      );
      const discountAmount = calcDiscount(
        subtotal,
        parsed.data.type,
        parsed.data.value
      );
      if (parsed.data.type === "PERCENT" && parsed.data.value > 100) {
        throw new AppError("VALIDATION", t("bill.discountPercentMax"));
      }
      if (discountAmount <= 0) {
        throw new AppError("VALIDATION", t("bill.discountTooSmall"));
      }

      const before = {
        discountType: bill.discountType,
        discountValue: bill.discountValue,
        discountAmount: bill.discountAmount,
      };

      const updated = await tx.bill.updateMany({
        where: { id: bill.id, status: "OPEN" },
        data: {
          discountType: parsed.data.type,
          discountValue: parsed.data.value,
          discountAmount,
          discountReason: parsed.data.reason,
          discountById: me.id,
          subtotal,
          total: subtotal - discountAmount,
        },
      });
      if (updated.count !== 1) {
        throw new AppError("CONFLICT", t("bill.notOpen"));
      }

      await writeAudit(tx, {
        actorId: me.id,
        action: "BILL_DISCOUNT",
        entityType: "Bill",
        entityId: bill.id,
        reason: parsed.data.reason,
        before,
        after: {
          discountType: parsed.data.type,
          discountValue: parsed.data.value,
          discountAmount,
        },
      });
    }, TX);

    revalidateBillPaths(parsed.data.billId);
    return ok(undefined);
  });
}

export async function removeDiscount(input: {
  billId: string;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["CASHIER", "OWNER"]);
    assertCan(me.role, "bills.discount");
    const billId = z.string().uuid().safeParse(input.billId);
    if (!billId.success) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      await lockOpenBill(tx, billId.data);

      const before = await tx.bill.findUnique({
        where: { id: billId.data },
        select: {
          status: true,
          discountType: true,
          discountValue: true,
          discountAmount: true,
          discountReason: true,
        },
      });
      if (!before || before.status !== "OPEN") {
        throw new AppError("CONFLICT", t("bill.notOpen"));
      }

      const cleared = await tx.bill.updateMany({
        where: { id: billId.data, status: "OPEN" },
        data: {
          discountType: null,
          discountValue: 0,
          discountAmount: 0,
          discountReason: null,
          discountById: null,
        },
      });
      if (cleared.count !== 1) {
        throw new AppError("CONFLICT", t("bill.notOpen"));
      }

      await recalcOpenBillOrThrow(tx, billId.data);

      await writeAudit(tx, {
        actorId: me.id,
        action: "BILL_DISCOUNT_REMOVED",
        entityType: "Bill",
        entityId: billId.data,
        before: {
          discountType: before.discountType,
          discountValue: before.discountValue,
          discountAmount: before.discountAmount,
          discountReason: before.discountReason,
        },
      });
    }, TX);

    revalidateBillPaths(billId.data);
    return ok(undefined);
  });
}

/** تعديل كمية الماء على فاتورة مفتوحة — من صفحة التفاصيل */
export async function setBillWater(input: {
  billId: string;
  waterQty: number;
}): Promise<
  ActionResult<{
    total: number;
    subtotal: number;
    discountAmount: number;
    waterQty: number;
    waterPrice: number;
  }>
> {
  return handleAction(async () => {
    const me = await requireUser(["CASHIER", "OWNER"]);
    assertCan(me.role, "bills.pay");
    const schema = z.object({
      billId: z.string().uuid(),
      waterQty: z.number().int().min(0).max(50),
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    const shift = await findOpenShift();
    if (!shift) return fail(t("shift.closed"));

    const settings = await prisma.cafeSettings.findUnique({
      where: { id: 1 },
      select: { businessDayStartHour: true },
    });
    const businessDate = getBusinessDate(
      new Date(),
      settings?.businessDayStartHour ?? 5,
    );

    const result = await prisma.$transaction(async (tx) => {
      await lockOpenShift(tx, shift.id);
      await lockOpenBill(tx, parsed.data.billId);

      const bill = await tx.bill.findFirst({
        where: { id: parsed.data.billId, status: "OPEN" },
        select: { id: true, tableId: true, guestCount: true },
      });
      if (!bill) throw new AppError("CONFLICT", t("bill.notOpen"));

      const synced = await syncBillWater(tx, {
        billId: bill.id,
        tableId: bill.tableId,
        waterQty: parsed.data.waterQty,
        actorId: me.id,
        shiftId: shift.id,
        businessDate,
        guestCount: bill.guestCount,
      });

      await writeAudit(tx, {
        actorId: me.id,
        action: "BILL_WATER_SET",
        entityType: "Bill",
        entityId: bill.id,
        after: {
          waterQty: synced.waterQty,
          waterPrice: synced.waterPrice,
          total: synced.total,
        },
      });

      return {
        total: synced.total,
        subtotal: synced.subtotal,
        discountAmount: synced.discountAmount,
        waterQty: synced.waterQty,
        waterPrice: synced.waterPrice,
      };
    }, TX);

    revalidateBillPaths(parsed.data.billId);
    return ok(result);
  });
}

export async function payBill(input: {
  billId: string;
  receivedAmount: number;
}): Promise<ActionResult<{ change: number; voided?: boolean }>> {
  return handleAction(async () => {
    const me = await requireUser(["CASHIER", "OWNER"]);
    assertCan(me.role, "bills.pay");
    const schema = z.object({
      billId: z.string().uuid(),
      receivedAmount: iqdSchema,
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    const shift = await findOpenShift();
    if (!shift) return fail(t("shift.closed"));

    const result = await prisma.$transaction(async (tx) => {
      await lockOpenShift(tx, shift.id);
      await lockOpenBill(tx, parsed.data.billId);

      const totals = await recalcBillTotals(tx, parsed.data.billId);
      if (!totals) throw new AppError("CONFLICT", t("bill.notOpen"));

      // فاتورة بلا أصناف نشطة → إلغاء فارغ (مو خصم 100%)
      if (totals.itemCount === 0) {
        const voided = await tx.bill.updateMany({
          where: { id: parsed.data.billId, status: "OPEN" },
          data: {
            status: "VOID",
            voidedAt: new Date(),
            voidedById: me.id,
            voidReason: t("bill.autoVoidEmpty"),
          },
        });
        if (voided.count !== 1) {
          throw new AppError("CONFLICT", t("error.generic"));
        }
        await writeAudit(tx, {
          actorId: me.id,
          action: "BILL_VOID",
          entityType: "Bill",
          entityId: parsed.data.billId,
          reason: t("bill.autoVoidEmpty"),
          after: { status: "VOID", auto: true },
        });
        return { change: 0, voided: true };
      }

      // خصم كامل مسموح: total = 0 مع أصناف → PAID بمبلغ 0
      if (parsed.data.receivedAmount < totals.total) {
        throw new AppError("VALIDATION", t("bill.insufficientCash"));
      }

      const paid = await tx.bill.updateMany({
        where: { id: parsed.data.billId, status: "OPEN" },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paidById: me.id,
          shiftId: shift.id,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          total: totals.total,
        },
      });
      if (paid.count !== 1) throw new AppError("CONFLICT", t("error.generic"));

      await tx.payment.create({
        data: {
          billId: parsed.data.billId,
          shiftId: shift.id,
          amount: totals.total,
          receivedAmount: parsed.data.receivedAmount,
          createdById: me.id,
        },
      });

      await tx.order.updateMany({
        where: {
          billId: parsed.data.billId,
          status: { notIn: ["CANCELLED", "SERVED"] },
        },
        data: { status: "SERVED", servedAt: new Date() },
      });

      const change = parsed.data.receivedAmount - totals.total;
      await writeAudit(tx, {
        actorId: me.id,
        action: "BILL_PAID",
        entityType: "Bill",
        entityId: parsed.data.billId,
        after: {
          total: totals.total,
          receivedAmount: parsed.data.receivedAmount,
          change,
        },
      });

      return { change };
    }, TX);

    // لا نوقف رد الدفع على إعادة التحقق — الكاشير ينتقل للإيصال فوراً
    after(() => {
      revalidateBillPaths(parsed.data.billId);
    });
    return ok(result);
  });
}

export async function voidBill(input: {
  billId: string;
  reason: string;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["OWNER"]);
    assertCan(me.role, "bills.void");
    const schema = z.object({
      billId: z.string().uuid(),
      reason: reasonSchema,
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({
        where: { id: parsed.data.billId },
        select: { id: true, status: true, total: true },
      });
      if (!bill || (bill.status !== "OPEN" && bill.status !== "PAID")) {
        throw new AppError("CONFLICT", t("bill.cannotVoid"));
      }

      if (bill.status === "OPEN") {
        await lockOpenBill(tx, bill.id);
      } else {
        await tx.$queryRaw`SELECT id FROM bills WHERE id = ${bill.id}::uuid FOR UPDATE`;
      }

      const u = await tx.bill.updateMany({
        where: {
          id: bill.id,
          status: bill.status,
        },
        data: {
          status: "VOID",
          voidedAt: new Date(),
          voidedById: me.id,
          voidReason: parsed.data.reason,
        },
      });
      if (u.count !== 1) throw new AppError("CONFLICT", t("error.generic"));

      const now = new Date();
      await tx.order.updateMany({
        where: {
          billId: bill.id,
          status: { not: "CANCELLED" },
        },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancelledById: me.id,
          cancelReason: parsed.data.reason,
          cancelRequestedAt: null,
          cancelRequestedById: null,
        },
      });
      await tx.orderItem.updateMany({
        where: {
          status: "ACTIVE",
          order: { billId: bill.id },
        },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancelledById: me.id,
          cancelReason: parsed.data.reason,
        },
      });

      // شفت مغلق: أعد حساب المتوقع بعد إسقاط هذه الفاتورة. المعدود يبقى كما أغلقه الكاشير.
      if (bill.status === "PAID") {
        const payment = await tx.payment.findFirst({
          where: { billId: bill.id },
          select: { shiftId: true },
        });
        if (payment) {
          const shiftRow = await tx.shift.findUnique({
            where: { id: payment.shiftId },
            select: { openingCash: true, countedCash: true, closedAt: true },
          });
          if (shiftRow?.closedAt && shiftRow.countedCash != null) {
            const sales = await tx.payment.aggregate({
              where: { shiftId: payment.shiftId, bill: { status: "PAID" } },
              _sum: { amount: true },
            });
            const expectedCash = shiftRow.openingCash + (sales._sum.amount ?? 0);
            await tx.shift.update({
              where: { id: payment.shiftId },
              data: {
                expectedCash,
                difference: shiftRow.countedCash - expectedCash,
              },
            });
          }
        }
      }

      await writeAudit(tx, {
        actorId: me.id,
        action: "BILL_VOID",
        entityType: "Bill",
        entityId: bill.id,
        reason: parsed.data.reason,
        before: { status: bill.status, total: bill.total },
        after: { status: "VOID" },
      });
    }, TX);

    revalidateBillPaths(parsed.data.billId);
    revalidatePath("/owner/reports/voided");
    return ok(undefined);
  });
}
