/** يحدّد الكمية التالية لصنف الطلب (0 = حذف) */
export function nextOrderItemQty(current: number, delta: number) {
  if (!Number.isFinite(current) || !Number.isFinite(delta)) return current;
  const next = Math.floor(current) + Math.floor(delta);
  if (next <= 0) return 0;
  return Math.min(99, next);
}
