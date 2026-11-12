"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertCan, requireUser } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/audit";
import { parseBusinessDate } from "@/lib/date-db";
import { lockOpenBill, lockOpenShift } from "@/lib/billing/lock-open-bill";
import { recalcOpenBillOrThrow } from "@/lib/billing/recalc-bill";
import { nextDailyNumber } from "@/lib/orders/daily-number";
import { ensureDefaultWaterOnOrder } from "@/lib/billing/water";
import { loadMenuLinesForOrder } from "@/lib/orders/menu-lines";
import { nextStatus, prevStatus } from "@/lib/orders/transitions";
import { findOpenShift } from "@/lib/shifts/helpers";
import { getBusinessDate } from "@/lib/time";
import { AppError, ok, fail, type ActionResult } from "@/lib/errors";
import {
  handleAction,
  orderLineSchema,
  reasonSchema,
  noteSchema,
} from "@/actions/helpers";
import { t } from "@/lib/i18n/ar-iq";

const TX = { maxWait: 10_000, timeout: 20_000 } as const;

const guestCountSchema = z.number().int().min(1).max(50);

const createOrderSchema = z.object({
  type: z.literal("DINE_IN"),
  tableId: z.string().uuid(),
  items: z.array(orderLineSchema).min(1),
  note: noteSchema,
  /** يُسجَّل عند إنشاء فاتورة الطاولة لأول مرة */
  guestCount: guestCountSchema.optional(),
});

async function getSettingsStartHour() {
  const s = await prisma.cafeSettings.findUnique({ where: { id: 1 } });
  return s?.businessDayStartHour ?? 5;
}

async function requireOpenShiftOrFail() {
  const shift = await findOpenShift();
  if (!shift) throw new AppError("CONFLICT", t("shift.closed"));
  return shift;
}

async function getOrCreateOpenBill(
  tx: Prisma.TransactionClient,
  opts: {
    tableId: string;
    shiftId: string;
    businessDate: string;
    guestCount?: number;
  }
) {
  let bill = await tx.bill.findFirst({
    where: { tableId: opts.tableId, status: "OPEN" },
  });
  if (bill) {
    if (
      bill.guestCount == null &&
      typeof opts.guestCount === "number" &&
      opts.guestCount >= 1
    ) {
      bill = await tx.bill.update({
        where: { id: bill.id },
        data: { guestCount: opts.guestCount },
      });
    }
    return bill;
  }

  try {
    bill = await tx.bill.create({
      data: {
        type: "DINE_IN",
        tableId: opts.tableId,
        status: "OPEN",
        businessDate: parseBusinessDate(opts.businessDate),
        shiftId: opts.shiftId,
        guestCount: opts.guestCount ?? null,
      },
    });
    return bill;
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: string }).code)
        : "";
    if (code !== "P2002") throw e;
    bill = await tx.bill.findFirst({
      where: { tableId: opts.tableId, status: "OPEN" },
    });
    if (!bill) throw new AppError("CONFLICT", t("error.generic"));
    return bill;
  }
}

type MenuSnapshot = Awaited<ReturnType<typeof loadMenuLinesForOrder>>;

async function createOrderInTx(
  tx: Prisma.TransactionClient,
  me: { id: string; role: string },
  parsed: z.infer<typeof createOrderSchema>,
  opts: {
    shiftId: string;
    businessDate: string;
    snapshots: MenuSnapshot;
  }
) {
  // يقفل الشفت أولاً — إن كان إغلاق الصندوق جارياً ننتظر ثم نفشل إن أُغلق
  await lockOpenShift(tx, opts.shiftId);

  const bill = await getOrCreateOpenBill(tx, {
    tableId: parsed.tableId,
    shiftId: opts.shiftId,
    businessDate: opts.businessDate,
    guestCount: parsed.guestCount,
  });

  await lockOpenBill(tx, bill.id);

  const priorCount = await tx.order.count({
    where: { billId: bill.id, status: { not: "CANCELLED" } },
  });

  const dailyNumber = await nextDailyNumber(tx, opts.businessDate);

  const order = await tx.order.create({
    data: {
      businessDate: parseBusinessDate(opts.businessDate),
      dailyNumber,
      billId: bill.id,
      tableId: parsed.tableId,
      type: "DINE_IN",
      shiftId: opts.shiftId,
      createdById: me.id,
      note: parsed.note ?? null,
      isFollowUp: priorCount > 0,
      items: {
        create: opts.snapshots.map((s) => ({
          ...s,
          addedById: me.id,
        })),
      },
    },
  });

  // ماء افتراضي مع أول طلب فقط — التعديل لاحقاً من صفحة الفاتورة
  if (priorCount === 0) {
    await ensureDefaultWaterOnOrder(tx, {
      billId: bill.id,
      orderId: order.id,
      actorId: me.id,
      guestCount: bill.guestCount,
    });
  }

  await recalcOpenBillOrThrow(tx, bill.id);

  await writeAudit(tx, {
    actorId: me.id,
    action: "ORDER_CREATED",
    entityType: "Order",
    entityId: order.id,
    after: {
      dailyNumber,
      type: "DINE_IN",
      tableId: order.tableId,
      billId: bill.id,
      isFollowUp: priorCount > 0,
    },
  });

  return { order, dailyNumber, billId: bill.id };
}

export async function createOrder(
  input: z.infer<typeof createOrderSchema>
): Promise<ActionResult<{ orderId: string; dailyNumber: number; billId: string }>> {
  return handleAction(async () => {
    const me = await requireUser(["WAITER", "CASHIER", "OWNER"]);
    assertCan(me.role, "orders.create_dine_in");
    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));
    const data = parsed.data;

    // قراءات ثقيلة خارج المعاملة — تقلّل احتمال انتهاء المهلة
    const [shift, startHour] = await Promise.all([
      requireOpenShiftOrFail(),
      getSettingsStartHour(),
    ]);

    const table = await prisma.cafeTable.findFirst({
      where: { id: data.tableId, isActive: true },
      select: { id: true },
    });
    if (!table) return fail(t("error.notFound"));

    const snapshots = await loadMenuLinesForOrder(prisma, data.items);
    const businessDate = getBusinessDate(new Date(), startHour);

    const result = await prisma.$transaction(
      (tx) =>
        createOrderInTx(tx, me, data, {
          shiftId: shift.id,
          businessDate,
          snapshots,
        }),
      TX
    );

    revalidatePath("/waiter");
    revalidatePath("/cashier");
    revalidatePath("/cashier/bills");

    return ok({
      orderId: result.order.id,
      dailyNumber: result.dailyNumber,
      billId: result.billId,
    });
  });
}

const addItemsSchema = z.object({
  tableId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  items: z.array(orderLineSchema).min(1),
  note: noteSchema,
  guestCount: guestCountSchema.optional(),
});

export async function addItemsToOrder(
  input: z.infer<typeof addItemsSchema>
): Promise<ActionResult<{ orderId: string; dailyNumber?: number }>> {
  return handleAction(async () => {
    const me = await requireUser(["WAITER", "CASHIER", "OWNER"]);
    assertCan(me.role, "orders.add_items");
    const parsed = addItemsSchema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));
    const data = parsed.data;

    if (!data.tableId && !data.orderId) {
      return fail(t("error.generic"));
    }

    const shift = await requireOpenShiftOrFail();

    let tableId = data.tableId;
    const preferredOrderId = data.orderId;

    if (!tableId && preferredOrderId) {
      const o = await prisma.order.findUnique({
        where: { id: preferredOrderId },
        select: { tableId: true },
      });
      tableId = o?.tableId ?? undefined;
    }
    if (!tableId) return fail(t("error.generic"));

    const openBill = await prisma.bill.findFirst({
      where: { tableId, status: "OPEN" },
      select: { id: true },
    });
    const orderNote = data.note?.trim() || null;

    if (!openBill) {
      return createOrder({
        type: "DINE_IN",
        tableId,
        items: data.items,
        note: orderNote,
        guestCount: data.guestCount,
      });
    }

    if (
      data.guestCount != null &&
      (await prisma.bill.findFirst({
        where: { id: openBill.id, guestCount: null },
        select: { id: true },
      }))
    ) {
      await prisma.bill.update({
        where: { id: openBill.id },
        data: { guestCount: data.guestCount },
      });
    }

    const billId = openBill.id;

    const result = await prisma.$transaction(async (tx) => {
      await lockOpenShift(tx, shift.id);
      await lockOpenBill(tx, billId);

      async function appendToNewOrder(
        order: { id: string; dailyNumber: number },
      ) {
        const snapshots = await loadMenuLinesForOrder(tx, data.items);
        await tx.orderItem.createMany({
          data: snapshots.map((s) => ({
            orderId: order.id,
            ...s,
            addedById: me.id,
          })),
        });
        if (orderNote) {
          await tx.order.update({
            where: { id: order.id },
            data: { note: orderNote },
          });
        }
        await recalcOpenBillOrThrow(tx, billId);
        return { orderId: order.id, dailyNumber: order.dailyNumber };
      }

      let targetId = preferredOrderId;
      if (targetId) {
        const target = await tx.order.findFirst({
          where: {
            id: targetId,
            billId,
            status: "NEW",
          },
          select: { id: true, dailyNumber: true },
        });
        if (!target) targetId = undefined;
        else {
          return appendToNewOrder(target);
        }
      }

      const newOrder = await tx.order.findFirst({
        where: { billId, status: "NEW" },
        orderBy: { createdAt: "desc" },
        select: { id: true, dailyNumber: true },
      });

      if (newOrder) {
        return appendToNewOrder(newOrder);
      }

      // لا طلب NEW — أنشئ طلباً جديداً داخل نفس القفل
      const startHour = await getSettingsStartHour();
      const businessDate = getBusinessDate(new Date(), startHour);
      const snapshots = await loadMenuLinesForOrder(tx, data.items);
      const created = await createOrderInTx(
        tx,
        me,
        {
          type: "DINE_IN",
          tableId,
          items: data.items,
          note: orderNote,
        },
        {
          shiftId: shift.id,
          businessDate,
          snapshots,
        }
      );
      return {
        orderId: created.order.id,
        dailyNumber: created.dailyNumber,
      };
    }, TX);

    revalidatePath("/waiter");
    revalidatePath("/cashier");
    revalidatePath("/cashier/bills");
    return ok(result);
  });
}

/**
 * تعديل كمية صنف في الطلب.
 * الكمية 0 = حذف (نفس قواعد removeOrderItem).
 * الويتر: فقط ما أضافه وهو NEW.
 */
export async function adjustOrderItemQuantity(input: {
  orderItemId: string;
  quantity: number;
  reason?: string;
}): Promise<ActionResult<{ quantity: number }>> {
  return handleAction(async () => {
    const me = await requireUser(["WAITER", "CASHIER", "OWNER"]);
    const schema = z.object({
      orderItemId: z.string().uuid(),
      quantity: z.number().int().min(0).max(99),
      reason: reasonSchema.optional(),
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    if (parsed.data.quantity === 0) {
      const removed = await removeOrderItem({
        orderItemId: parsed.data.orderItemId,
        reason: parsed.data.reason,
      });
      if (!removed.ok) return removed;
      return ok({ quantity: 0 });
    }

    await prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({
        where: { id: parsed.data.orderItemId },
        select: {
          id: true,
          status: true,
          quantity: true,
          addedById: true,
          menuItemId: true,
          orderId: true,
          order: {
            select: {
              status: true,
              billId: true,
              bill: { select: { status: true } },
            },
          },
        },
      });
      if (!item || item.status !== "ACTIVE") {
        throw new AppError("NOT_FOUND", t("error.notFound"));
      }
      if (item.order.bill.status !== "OPEN") {
        throw new AppError("CONFLICT", t("bill.notOpen"));
      }
      if (item.quantity === parsed.data.quantity) return;

      await lockOpenBill(tx, item.order.billId);
      const isWaiterOnly = me.role === "WAITER";

      if (isWaiterOnly) {
        assertCan(me.role, "orders.remove_item_own_new");
        if (item.addedById !== me.id || item.order.status !== "NEW") {
          throw new AppError("FORBIDDEN", t("order.askCashier"));
        }
      } else {
        assertCan(me.role, "orders.remove_item_any");
        // الحذف الكامل (كمية 0) عبر removeOrderItem ويطلب سبباً
      }

      if (parsed.data.quantity > item.quantity) {
        const menu = await tx.menuItem.findFirst({
          where: { id: item.menuItemId, isActive: true },
          select: { isAvailable: true, name: true },
        });
        if (!menu?.isAvailable) {
          throw new AppError(
            "VALIDATION",
            t("error.itemSoldOutNamed", { name: menu?.name ?? "" }),
          );
        }
      }

      const updated = await tx.orderItem.updateMany({
        where: isWaiterOnly
          ? {
              id: item.id,
              status: "ACTIVE",
              addedById: me.id,
              order: { status: "NEW", bill: { status: "OPEN" } },
            }
          : {
              id: item.id,
              status: "ACTIVE",
              order: { bill: { status: "OPEN" } },
            },
        data: { quantity: parsed.data.quantity },
      });
      if (updated.count !== 1) {
        throw new AppError(
          isWaiterOnly ? "FORBIDDEN" : "CONFLICT",
          isWaiterOnly ? t("order.askCashier") : t("error.generic"),
        );
      }

      await recalcOpenBillOrThrow(tx, item.order.billId);

      if (!isWaiterOnly || parsed.data.quantity < item.quantity) {
        await writeAudit(tx, {
          actorId: me.id,
          action: "ORDER_ITEM_QTY_CHANGED",
          entityType: "OrderItem",
          entityId: item.id,
          reason: parsed.data.reason ?? t("order.waiterRemoveReason"),
          after: {
            from: item.quantity,
            to: parsed.data.quantity,
          },
        });
      }
    }, TX);

    revalidatePath("/waiter");
    revalidatePath("/cashier");
    revalidatePath("/cashier/bills");
    return ok({ quantity: parsed.data.quantity });
  });
}

export async function removeOrderItem(input: {
  orderItemId: string;
  reason?: string;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["WAITER", "CASHIER", "OWNER"]);
    const schema = z.object({
      orderItemId: z.string().uuid(),
      reason: reasonSchema.optional(),
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({
        where: { id: parsed.data.orderItemId },
        select: {
          id: true,
          status: true,
          addedById: true,
          orderId: true,
          order: {
            select: {
              status: true,
              billId: true,
              bill: { select: { status: true } },
            },
          },
        },
      });
      if (!item || item.status !== "ACTIVE") {
        throw new AppError("NOT_FOUND", t("error.notFound"));
      }
      if (item.order.bill.status !== "OPEN") {
        throw new AppError("CONFLICT", t("bill.notOpen"));
      }
      await lockOpenBill(tx, item.order.billId);

      let reason = parsed.data.reason ?? "";
      const isWaiterOnly = me.role === "WAITER";

      if (isWaiterOnly) {
        assertCan(me.role, "orders.remove_item_own_new");
        if (item.addedById !== me.id || item.order.status !== "NEW") {
          throw new AppError("FORBIDDEN", t("order.askCashier"));
        }
        reason = t("order.waiterRemoveReason");
      } else {
        assertCan(me.role, "orders.remove_item_any");
        if (reason.length < 3) {
          throw new AppError("VALIDATION", t("error.reasonShort"));
        }
      }

      // الويتر: الصنف + الطلب ما زال NEW داخل نفس الشرط الذري
      const updated = await tx.orderItem.updateMany({
        where: isWaiterOnly
          ? {
              id: item.id,
              status: "ACTIVE",
              addedById: me.id,
              order: { status: "NEW", bill: { status: "OPEN" } },
            }
          : {
              id: item.id,
              status: "ACTIVE",
              order: { bill: { status: "OPEN" } },
            },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: me.id,
          cancelReason: reason,
        },
      });
      if (updated.count !== 1) {
        throw new AppError(
          isWaiterOnly ? "FORBIDDEN" : "CONFLICT",
          isWaiterOnly ? t("order.askCashier") : t("error.generic")
        );
      }

      const activeLeft = await tx.orderItem.count({
        where: { orderId: item.orderId, status: "ACTIVE" },
      });
      if (activeLeft === 0) {
        const cancelledOrder = await tx.order.updateMany({
          where: {
            id: item.orderId,
            status: { not: "CANCELLED" },
          },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelledById: me.id,
            cancelReason: reason,
          },
        });
        if (cancelledOrder.count !== 1) {
          throw new AppError("CONFLICT", t("error.generic"));
        }
        await writeAudit(tx, {
          actorId: me.id,
          action: "ORDER_CANCELLED",
          entityType: "Order",
          entityId: item.orderId,
          reason,
          after: { via: "last_item_removed" },
        });
      }

      await recalcOpenBillOrThrow(tx, item.order.billId);

      if (!isWaiterOnly) {
        await writeAudit(tx, {
          actorId: me.id,
          action: "ORDER_ITEM_CANCELLED",
          entityType: "OrderItem",
          entityId: item.id,
          reason,
        });
      }
    }, TX);

    revalidatePath("/waiter");
    revalidatePath("/cashier");
    return ok(undefined);
  });
}

export async function requestCancelOrder(input: {
  orderId: string;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["WAITER"]);
    assertCan(me.role, "orders.request_cancel");
    const orderId = z.string().uuid().safeParse(input.orderId);
    if (!orderId.success) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId.data },
        select: { id: true, billId: true, bill: { select: { status: true } } },
      });
      if (!order || order.bill.status !== "OPEN") {
        throw new AppError("CONFLICT", t("bill.notOpen"));
      }
      await lockOpenBill(tx, order.billId);

      const updated = await tx.order.updateMany({
        where: {
          id: orderId.data,
          status: { notIn: ["CANCELLED", "SERVED"] },
          cancelRequestedAt: null,
          bill: { status: "OPEN" },
        },
        data: {
          cancelRequestedAt: new Date(),
          cancelRequestedById: me.id,
        },
      });

      if (updated.count !== 1) {
        throw new AppError("CONFLICT", t("error.generic"));
      }

      await writeAudit(tx, {
        actorId: me.id,
        action: "ORDER_CANCEL_REQUESTED",
        entityType: "Order",
        entityId: orderId.data,
      });
    }, TX);

    revalidatePath("/waiter");
    revalidatePath("/cashier");
    return ok(undefined);
  });
}

export async function clearCancelRequest(input: {
  orderId: string;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["CASHIER", "OWNER"]);
    const orderId = z.string().uuid().safeParse(input.orderId);
    if (!orderId.success) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId.data },
        select: { id: true, billId: true, bill: { select: { status: true } } },
      });
      if (!order || order.bill.status !== "OPEN") {
        throw new AppError("CONFLICT", t("bill.notOpen"));
      }
      await lockOpenBill(tx, order.billId);

      const cleared = await tx.order.updateMany({
        where: {
          id: orderId.data,
          cancelRequestedAt: { not: null },
          bill: { status: "OPEN" },
        },
        data: { cancelRequestedAt: null, cancelRequestedById: null },
      });
      if (cleared.count !== 1) {
        throw new AppError("CONFLICT", t("error.generic"));
      }

      await writeAudit(tx, {
        actorId: me.id,
        action: "ORDER_CANCEL_REQUEST_CLEARED",
        entityType: "Order",
        entityId: orderId.data,
      });
    }, TX);

    revalidatePath("/cashier");
    return ok(undefined);
  });
}

export async function cancelOrder(input: {
  orderId: string;
  reason: string;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["CASHIER", "OWNER"]);
    assertCan(me.role, "orders.cancel");
    const schema = z.object({
      orderId: z.string().uuid(),
      reason: reasonSchema,
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: parsed.data.orderId },
        include: { bill: true },
      });
      if (!order) throw new AppError("NOT_FOUND", t("error.notFound"));
      if (order.bill.status !== "OPEN") {
        throw new AppError("CONFLICT", t("bill.notOpen"));
      }
      await lockOpenBill(tx, order.billId);

      const u = await tx.order.updateMany({
        where: {
          id: order.id,
          status: { not: "CANCELLED" },
          bill: { status: "OPEN" },
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: me.id,
          cancelReason: parsed.data.reason,
          cancelRequestedAt: null,
          cancelRequestedById: null,
        },
      });
      if (u.count !== 1) throw new AppError("CONFLICT", t("error.generic"));

      await tx.orderItem.updateMany({
        where: { orderId: order.id, status: "ACTIVE" },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: me.id,
          cancelReason: parsed.data.reason,
        },
      });

      await recalcOpenBillOrThrow(tx, order.billId);
      await writeAudit(tx, {
        actorId: me.id,
        action: "ORDER_CANCELLED",
        entityType: "Order",
        entityId: order.id,
        reason: parsed.data.reason,
      });
    }, TX);

    revalidatePath("/cashier");
    revalidatePath("/waiter");
    return ok(undefined);
  });
}

function statusTimestampField(status: string): "preparingAt" | "readyAt" | "servedAt" | null {
  if (status === "PREPARING") return "preparingAt";
  if (status === "READY") return "readyAt";
  if (status === "SERVED") return "servedAt";
  return null;
}

export async function advanceOrderStatus(input: {
  orderId: string;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["WAITER", "CASHIER", "OWNER"]);
    const orderId = z.string().uuid().safeParse(input.orderId);
    if (!orderId.success) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId.data },
        select: {
          id: true,
          status: true,
          billId: true,
          bill: { select: { status: true } },
        },
      });
      if (!order) throw new AppError("NOT_FOUND", t("error.notFound"));
      if (order.bill.status !== "OPEN") {
        throw new AppError("CONFLICT", t("bill.notOpen"));
      }

      // الويتر: فقط جاهز → تم التقديم (هو من يقدّم فعلياً)
      if (me.role === "WAITER") {
        assertCan(me.role, "orders.mark_served");
        if (order.status !== "READY") {
          throw new AppError("FORBIDDEN", t("error.noPermission"));
        }
      } else {
        assertCan(me.role, "orders.advance_status");
      }

      const next = nextStatus(order.status);
      if (!next) throw new AppError("CONFLICT", t("error.generic"));

      await lockOpenBill(tx, order.billId);

      const field = statusTimestampField(next);
      const u = await tx.order.updateMany({
        where: {
          id: order.id,
          status: order.status,
          bill: { status: "OPEN" },
        },
        data: {
          status: next,
          ...(field ? { [field]: new Date() } : {}),
        },
      });
      if (u.count !== 1) throw new AppError("CONFLICT", t("error.generic"));
    }, TX);

    revalidatePath("/cashier");
    revalidatePath("/waiter");
    return ok(undefined);
  });
}

export async function revertOrderStatus(input: {
  orderId: string;
  reason: string;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["CASHIER", "OWNER"]);
    assertCan(me.role, "orders.revert_status");
    const schema = z.object({
      orderId: z.string().uuid(),
      reason: reasonSchema,
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: parsed.data.orderId },
        select: {
          id: true,
          status: true,
          billId: true,
          bill: { select: { status: true } },
        },
      });
      if (!order) throw new AppError("NOT_FOUND", t("error.notFound"));
      if (order.bill.status !== "OPEN") {
        throw new AppError("CONFLICT", t("bill.notOpen"));
      }
      const prev = prevStatus(order.status);
      if (!prev) throw new AppError("CONFLICT", t("error.generic"));

      await lockOpenBill(tx, order.billId);

      const u = await tx.order.updateMany({
        where: {
          id: order.id,
          status: order.status,
          bill: { status: "OPEN" },
        },
        data: { status: prev },
      });
      if (u.count !== 1) throw new AppError("CONFLICT", t("error.generic"));

      await writeAudit(tx, {
        actorId: me.id,
        action: "ORDER_STATUS_REVERTED",
        entityType: "Order",
        entityId: order.id,
        reason: parsed.data.reason,
        before: { status: order.status },
        after: { status: prev },
      });
    }, TX);

    revalidatePath("/cashier");
    revalidatePath("/waiter");
    return ok(undefined);
  });
}
