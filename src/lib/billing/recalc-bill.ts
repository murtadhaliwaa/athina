import type { Prisma } from "@prisma/client";
import { calcTotals } from "@/lib/billing/calc";
import { AppError } from "@/lib/errors";
import { t } from "@/lib/i18n/ar-iq";

/**
 * يعيد حساب فاتورة مفتوحة فقط.
 * لا يكتب على PAID/VOID حتى لا يتغيّر الإجمالي بعد الدفع.
 */
export async function recalcBillTotals(
  tx: Prisma.TransactionClient,
  billId: string
) {
  const bill = await tx.bill.findUnique({ where: { id: billId } });
  if (!bill) return null;
  if (bill.status !== "OPEN") return null;

  const items = await tx.orderItem.findMany({
    where: {
      status: "ACTIVE",
      order: {
        billId,
        status: { not: "CANCELLED" },
      },
    },
    select: { priceSnapshot: true, quantity: true },
  });

  const { subtotal, discountAmount, total } = calcTotals(
    items,
    bill.discountType,
    bill.discountValue
  );

  const updated = await tx.bill.updateMany({
    where: { id: billId, status: "OPEN" },
    data: { subtotal, discountAmount, total },
  });
  if (updated.count !== 1) return null;

  return { subtotal, discountAmount, total, itemCount: items.length };
}

/** مثل recalcBillTotals لكن يرمي إن الفاتورة لم تعد مفتوحة */
export async function recalcOpenBillOrThrow(
  tx: Prisma.TransactionClient,
  billId: string
) {
  const totals = await recalcBillTotals(tx, billId);
  if (!totals) throw new AppError("CONFLICT", t("bill.notOpen"));
  return totals;
}
