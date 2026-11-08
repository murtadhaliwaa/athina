"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertCan, requireUser } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/audit";
import { lockOpenShift } from "@/lib/billing/lock-open-bill";
import { findOpenShift } from "@/lib/shifts/helpers";
import { AppError, ok, fail, type ActionResult } from "@/lib/errors";
import { handleAction, iqdSchema } from "@/actions/helpers";
import { t } from "@/lib/i18n/ar-iq";

const TX = { maxWait: 10_000, timeout: 20_000 } as const;

export async function openShift(input: {
  openingCash: number;
}): Promise<ActionResult<{ id: string }>> {
  return handleAction(async () => {
    const me = await requireUser(["CASHIER", "OWNER"]);
    assertCan(me.role, "shifts.open_close");
    const cash = iqdSchema.safeParse(input.openingCash);
    if (!cash.success) return fail(t("error.generic"));

    try {
      const shift = await prisma.$transaction(async (tx) => {
        const existing = await tx.shift.findFirst({
          where: { closedAt: null },
          select: { id: true },
        });
        if (existing) throw new AppError("CONFLICT", t("shift.alreadyOpen"));

        const created = await tx.shift.create({
          data: {
            openedById: me.id,
            openingCash: cash.data,
          },
        });
        await writeAudit(tx, {
          actorId: me.id,
          action: "SHIFT_OPENED",
          entityType: "Shift",
          entityId: created.id,
          after: { openingCash: cash.data },
        });
        return created;
      }, TX);

      revalidatePath("/cashier");
      revalidatePath("/cashier/shift");
      revalidatePath("/waiter");
      return ok({ id: shift.id });
    } catch (e) {
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        (e as { code?: string }).code === "P2002"
      ) {
        return fail(t("shift.alreadyOpen"));
      }
      throw e;
    }
  });
}

export async function closeShift(input: {
  countedCash: number;
  note?: string | null;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["CASHIER", "OWNER"]);
    assertCan(me.role, "shifts.open_close");
    const schema = z.object({
      countedCash: iqdSchema,
      note: z.string().trim().max(200).optional().nullable(),
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    const open = await findOpenShift();
    if (!open) return fail(t("shift.notOpen"));

    await prisma.$transaction(async (tx) => {
      await lockOpenShift(tx, open.id);

      const shiftRow = await tx.shift.findUnique({
        where: { id: open.id },
        select: { openingCash: true, closedAt: true },
      });
      if (!shiftRow || shiftRow.closedAt) {
        throw new AppError("CONFLICT", t("shift.notOpen"));
      }

      // أي فاتورة مفتوحة — حتى لو انفتحت بشفت سابق
      const openBills = await tx.bill.count({
        where: { status: "OPEN" },
      });
      if (openBills > 0) {
        throw new AppError("CONFLICT", t("shift.openBillsBlock"));
      }

      const payments = await tx.payment.aggregate({
        where: { shiftId: open.id, bill: { status: "PAID" } },
        _sum: { amount: true },
      });
      const sales = payments._sum.amount ?? 0;
      const expectedCash = shiftRow.openingCash + sales;
      const difference = parsed.data.countedCash - expectedCash;

      const updated = await tx.shift.updateMany({
        where: { id: open.id, closedAt: null },
        data: {
          closedAt: new Date(),
          closedById: me.id,
          countedCash: parsed.data.countedCash,
          expectedCash,
          difference,
          note: parsed.data.note ?? null,
        },
      });
      if (updated.count !== 1) {
        throw new AppError("CONFLICT", t("error.generic"));
      }

      await writeAudit(tx, {
        actorId: me.id,
        action: "SHIFT_CLOSED",
        entityType: "Shift",
        entityId: open.id,
        after: {
          countedCash: parsed.data.countedCash,
          expectedCash,
          difference,
        },
      });
    }, TX);

    revalidatePath("/cashier");
    revalidatePath("/cashier/shift");
    revalidatePath("/waiter");
    return ok(undefined);
  });
}

export async function getOpenShiftPublic() {
  await requireUser(["OWNER", "CASHIER", "WAITER"]);
  return findOpenShift();
}
