import "server-only";

import { z } from "zod";
import { AppError, fail, type ActionResult } from "@/lib/errors";
import { t } from "@/lib/i18n/ar-iq";

export const reasonSchema = z.string().trim().min(3, t("error.reasonShort")).max(200);
export const noteSchema = z.string().trim().max(140).optional().nullable();
export const qtySchema = z.number().int().min(1).max(99);
export const iqdSchema = z.number().int().min(0);

export const orderLineSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: qtySchema,
  note: noteSchema,
});

export async function handleAction<T>(
  fn: () => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AppError) return fail(e.message);
    console.error(e);
    // مهلة معاملة Prisma / شبكة بطيئة
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code?: string }).code === "P2028"
    ) {
      return fail(t("error.timeout"));
    }
    return fail(t("error.generic"));
  }
}
