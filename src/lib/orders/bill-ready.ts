import type { OrderStatus } from "@prisma/client";

/** طلب ما زال يحتاج تحضير — يمنع اعتبار الفاتورة جاهزة */
export function isOrderStillPreparing(status: OrderStatus): boolean {
  return status === "NEW" || status === "PREPARING";
}

/**
 * الفاتورة جاهزة للدفع/للإشارة الخضراء عندما يوجد طلب واحد على الأقل
 * وكل الطلبات النشطة جاهزة أو انقدّمت (مو جديد/يتحضّر).
 */
export function areBillOrdersReady(
  statuses: readonly OrderStatus[],
): boolean {
  if (statuses.length === 0) return false;
  return statuses.every((s) => !isOrderStillPreparing(s));
}
