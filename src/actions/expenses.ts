"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertCan, requireUser } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/audit";
import { businessDateToIso, parseBusinessDate } from "@/lib/date-db";
import { isExpenseCategoryId } from "@/lib/expenses/categories";
import { getCafeSettings } from "@/lib/queries/settings";
import {
  resolveReportRange,
  type ReportPreset,
} from "@/lib/reports/date-range";
import { getBusinessDate } from "@/lib/time";
import { AppError, ok, fail, type ActionResult } from "@/lib/errors";
import { handleAction, iqdSchema, reasonSchema } from "@/actions/helpers";
import { t } from "@/lib/i18n/ar-iq";

const TX = { maxWait: 10_000, timeout: 20_000 } as const;

const expenseCategorySchema = z
  .string()
  .refine(isExpenseCategoryId, t("error.generic"));

const createExpenseSchema = z.object({
  amount: iqdSchema.refine((n) => n >= 1, t("expense.amountRequired")),
  title: z.string().trim().min(2).max(100),
  category: expenseCategorySchema,
  note: z.string().trim().max(200).optional().nullable(),
  businessDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function createExpense(
  input: z.infer<typeof createExpenseSchema>,
): Promise<ActionResult<{ id: string }>> {
  return handleAction(async () => {
    const me = await requireUser(["OWNER"]);
    assertCan(me.role, "expenses.manage");
    const parsed = createExpenseSchema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    const settings = await getCafeSettings();
    const startHour = settings?.businessDayStartHour ?? 5;
    const businessDate =
      parsed.data.businessDate ?? getBusinessDate(new Date(), startHour);

    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.expense.create({
        data: {
          amount: parsed.data.amount,
          title: parsed.data.title,
          category: parsed.data.category,
          note: parsed.data.note?.trim() ? parsed.data.note.trim() : null,
          businessDate: parseBusinessDate(businessDate),
          createdById: me.id,
        },
        select: { id: true, amount: true, title: true, category: true },
      });

      await writeAudit(tx, {
        actorId: me.id,
        action: "EXPENSE_CREATED",
        entityType: "Expense",
        entityId: row.id,
        after: {
          amount: row.amount,
          title: row.title,
          category: row.category,
          businessDate,
        },
      });

      return row;
    }, TX);

    revalidatePath("/owner/expenses");
    return ok({ id: created.id });
  });
}

const updateExpenseSchema = createExpenseSchema.extend({
  expenseId: z.string().uuid(),
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function updateExpense(
  input: z.infer<typeof updateExpenseSchema>,
): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["OWNER"]);
    assertCan(me.role, "expenses.manage");
    const parsed = updateExpenseSchema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      const before = await tx.expense.findUnique({
        where: { id: parsed.data.expenseId },
        select: {
          id: true,
          amount: true,
          title: true,
          category: true,
          note: true,
          businessDate: true,
          voidedAt: true,
        },
      });
      if (!before) throw new AppError("NOT_FOUND", t("error.notFound"));
      if (before.voidedAt) {
        throw new AppError("CONFLICT", t("expense.alreadyVoided"));
      }

      const note = parsed.data.note?.trim()
        ? parsed.data.note.trim()
        : null;

      const updated = await tx.expense.updateMany({
        where: { id: before.id, voidedAt: null },
        data: {
          amount: parsed.data.amount,
          title: parsed.data.title,
          category: parsed.data.category,
          note,
          businessDate: parseBusinessDate(parsed.data.businessDate),
        },
      });
      if (updated.count !== 1) {
        throw new AppError("CONFLICT", t("error.generic"));
      }

      await writeAudit(tx, {
        actorId: me.id,
        action: "EXPENSE_UPDATED",
        entityType: "Expense",
        entityId: before.id,
        before: {
          amount: before.amount,
          title: before.title,
          category: before.category,
          note: before.note,
          businessDate: businessDateToIso(before.businessDate),
        },
        after: {
          amount: parsed.data.amount,
          title: parsed.data.title,
          category: parsed.data.category,
          note,
          businessDate: parsed.data.businessDate,
        },
      });
    }, TX);

    revalidatePath("/owner/expenses");
    return ok(undefined);
  });
}

export async function voidExpense(input: {
  expenseId: string;
  reason: string;
}): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["OWNER"]);
    assertCan(me.role, "expenses.manage");
    const schema = z.object({
      expenseId: z.string().uuid(),
      reason: reasonSchema,
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    await prisma.$transaction(async (tx) => {
      const before = await tx.expense.findUnique({
        where: { id: parsed.data.expenseId },
        select: {
          id: true,
          amount: true,
          title: true,
          voidedAt: true,
        },
      });
      if (!before) throw new AppError("NOT_FOUND", t("error.notFound"));
      if (before.voidedAt) {
        throw new AppError("CONFLICT", t("expense.alreadyVoided"));
      }

      const updated = await tx.expense.updateMany({
        where: { id: before.id, voidedAt: null },
        data: {
          voidedAt: new Date(),
          voidedById: me.id,
          voidReason: parsed.data.reason,
        },
      });
      if (updated.count !== 1) {
        throw new AppError("CONFLICT", t("error.generic"));
      }

      await writeAudit(tx, {
        actorId: me.id,
        action: "EXPENSE_VOIDED",
        entityType: "Expense",
        entityId: before.id,
        reason: parsed.data.reason,
        before: { amount: before.amount, title: before.title },
        after: { voided: true },
      });
    }, TX);

    revalidatePath("/owner/expenses");
    return ok(undefined);
  });
}

export type ExpenseListItem = {
  id: string;
  amount: number;
  title: string;
  category: string;
  note: string | null;
  businessDate: string;
  createdAt: string;
  createdByName: string;
};

export async function getExpensesPageData(input?: {
  preset?: ReportPreset;
  from?: string;
  to?: string;
}) {
  const me = await requireUser(["OWNER"]);
  assertCan(me.role, "expenses.manage");

  const settings = await getCafeSettings();
  const startHour = settings?.businessDayStartHour ?? 5;
  const preset = input?.preset ?? "thisMonth";
  const { from, to } = resolveReportRange(
    preset,
    input?.from,
    input?.to,
    startHour,
  );

  const fromDate = parseBusinessDate(from);
  const toDate = parseBusinessDate(to);

  const [expenses, expenseAgg, salesAgg] = await Promise.all([
    prisma.expense.findMany({
      where: {
        voidedAt: null,
        businessDate: { gte: fromDate, lte: toDate },
      },
      orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }],
      take: 200,
      select: {
        id: true,
        amount: true,
        title: true,
        category: true,
        note: true,
        businessDate: true,
        createdAt: true,
        createdBy: { select: { fullName: true } },
      },
    }),
    prisma.expense.aggregate({
      where: {
        voidedAt: null,
        businessDate: { gte: fromDate, lte: toDate },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.bill.aggregate({
      where: {
        status: "PAID",
        businessDate: { gte: fromDate, lte: toDate },
      },
      _sum: { total: true },
    }),
  ]);

  const expenseTotal = expenseAgg._sum.amount ?? 0;
  const salesTotal = salesAgg._sum.total ?? 0;

  return {
    range: { from, to, preset },
    expenseTotal,
    salesTotal,
    net: salesTotal - expenseTotal,
    count: expenseAgg._count,
    items: expenses.map(
      (e): ExpenseListItem => ({
        id: e.id,
        amount: e.amount,
        title: e.title,
        category: e.category,
        note: e.note,
        businessDate: businessDateToIso(e.businessDate),
        createdAt: e.createdAt.toISOString(),
        createdByName: e.createdBy.fullName,
      }),
    ),
  };
}
