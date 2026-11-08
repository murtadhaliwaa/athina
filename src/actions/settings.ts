"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guard";
import { writeAudit } from "@/lib/audit";
import { ok, fail, type ActionResult } from "@/lib/errors";
import { handleAction } from "@/actions/helpers";
import { t } from "@/lib/i18n/ar-iq";

const updateSchema = z.object({
  cafeName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30).optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
  receiptFooter: z.string().trim().max(200).optional().nullable(),
  businessDayStartHour: z.number().int().min(0).max(12),
});

export async function updateSettings(input: z.infer<typeof updateSchema>): Promise<ActionResult> {
  return handleAction(async () => {
    const me = await requireUser(["OWNER"]);
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) return fail(t("error.generic"));

    const before = await prisma.cafeSettings.findUnique({ where: { id: 1 } });

    await prisma.$transaction(async (tx) => {
      const after = await tx.cafeSettings.update({
        where: { id: 1 },
        data: parsed.data,
      });
      await writeAudit(tx, {
        actorId: me.id,
        action: "SETTINGS_UPDATED",
        entityType: "CafeSettings",
        entityId: "1",
        before: before ?? undefined,
        after,
      });
    });

    updateTag("settings");
    revalidatePath("/owner/settings");
    return ok(undefined);
  });
}

export async function getSettings() {
  await requireUser(["OWNER", "CASHIER", "WAITER"]);
  return prisma.cafeSettings.findUnique({ where: { id: 1 } });
}
