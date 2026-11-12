/** اسم صنف الماء في المنيو — يجب أن يطابق البذرة/المنيو */
export const WATER_ITEM_NAME = "ماء";

/** كمية الماء الافتراضية عند أول طلب على الفاتورة */
export const DEFAULT_WATER_QTY = 1;

export function clampWaterQty(
  qty: number,
  guestCount: number | null | undefined,
) {
  const max =
    typeof guestCount === "number" && guestCount > 0 ? guestCount : 50;
  if (!Number.isFinite(qty)) return 0;
  return Math.max(0, Math.min(max, Math.floor(qty)));
}

export function isWaterItemName(name: string | null | undefined) {
  return (name ?? "").trim() === WATER_ITEM_NAME;
}
