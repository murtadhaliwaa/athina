"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guard";
import { ok, fail, type ActionResult } from "@/lib/errors";
import { handleAction } from "@/actions/helpers";
import { t } from "@/lib/i18n/ar-iq";

const labelSchema = z.string().trim().min(1).max(20);

export async function createTable(input: {
  label: string;
  sortOrder?: number;
}): Promise<ActionResult<{ id: string }>> {
  return handleAction(async () => {
    await requireUser(["OWNER"]);
    const label = labelSchema.safeParse(input.label);
    if (!label.success) return fail(t("error.generic"));

    const max = await prisma.cafeTable.aggregate({ _max: { sortOrder: true } });
    const sortOrder = input.sortOrder ?? (max._max.sortOrder ?? 0) + 1;

    const table = await prisma.cafeTable.create({
      data: { label: label.data, sortOrder },
    });

    revalidatePath("/owner/tables");
    revalidatePath("/waiter");
    return ok({ id: table.id });
  });
}

export async function updateTable(input: {
  id: string;
  label: string;
  sortOrder: number;
}): Promise<ActionResult> {
  return handleAction(async () => {
    await requireUser(["OWNER"]);
    const schema = z.object({
      id: z.string().uuid(),
      label: labelSchema,
      sortOrder: z.number().int().min(0),
    });
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    await prisma.cafeTable.update({
      where: { id: parsed.data.id },
      data: {
        label: parsed.data.label,
        sortOrder: parsed.data.sortOrder,
      },
    });

    revalidatePath("/owner/tables");
    revalidatePath("/waiter");
    return ok(undefined);
  });
}

export async function reorderTables(input: {
  orderedIds: string[];
}): Promise<ActionResult> {
  return handleAction(async () => {
    await requireUser(["OWNER"]);
    const ids = z.array(z.string().uuid()).safeParse(input.orderedIds);
    if (!ids.success) return fail(t("error.generic"));

    await prisma.$transaction(
      ids.data.map((id, index) =>
        prisma.cafeTable.update({
          where: { id },
          data: { sortOrder: index + 1 },
        })
      )
    );

    revalidatePath("/owner/tables");
    revalidatePath("/waiter");
    return ok(undefined);
  });
}

export async function toggleTable(input: { id: string }): Promise<ActionResult> {
  return handleAction(async () => {
    await requireUser(["OWNER"]);
    const id = z.string().uuid().safeParse(input.id);
    if (!id.success) return fail(t("error.generic"));

    const table = await prisma.cafeTable.findUnique({ where: { id: id.data } });
    if (!table) return fail(t("error.notFound"));

    if (table.isActive) {
      const openBill = await prisma.bill.findFirst({
        where: { tableId: table.id, status: "OPEN" },
      });
      if (openBill) return fail(t("tables.hasOpenBill"));
    }

    await prisma.cafeTable.update({
      where: { id: table.id },
      data: { isActive: !table.isActive },
    });

    revalidatePath("/owner/tables");
    revalidatePath("/waiter");
    return ok(undefined);
  });
}
