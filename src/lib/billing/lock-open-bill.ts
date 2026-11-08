import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { t } from "@/lib/i18n/ar-iq";

/** يقفل صف فاتورة مفتوحة داخل المعاملة — يمنع الدفع/الخصم/إضافة الأصناف المتزامنة */
export async function lockOpenBill(
  tx: Prisma.TransactionClient,
  billId: string
) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM bills
    WHERE id = ${billId}::uuid AND status = 'OPEN'
    FOR UPDATE`;
  if (rows.length !== 1) {
    throw new AppError("CONFLICT", t("bill.notOpen"));
  }
  return rows[0].id;
}

/** يقفل الشفت المفتوح — يمنع إنشاء طلب أثناء إغلاق الصندوق */
export async function lockOpenShift(
  tx: Prisma.TransactionClient,
  shiftId: string
) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM shifts
    WHERE id = ${shiftId}::uuid AND "closedAt" IS NULL
    FOR UPDATE`;
  if (rows.length !== 1) {
    throw new AppError("CONFLICT", t("shift.closed"));
  }
  return rows[0].id;
}
