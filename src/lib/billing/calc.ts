export const ROUNDING_STEP = 250;

export function calcDiscount(
  subtotal: number,
  type: "AMOUNT" | "PERCENT" | null,
  value: number
): number {
  if (!type || value <= 0) return 0;
  const raw =
    type === "PERCENT" ? (subtotal * Math.min(value, 100)) / 100 : value;
  const rounded =
    type === "PERCENT"
      ? Math.round(raw / ROUNDING_STEP) * ROUNDING_STEP
      : Math.round(raw);
  return Math.max(0, Math.min(rounded, subtotal));
}

export function calcTotals(
  items: { priceSnapshot: number; quantity: number }[],
  discountType: "AMOUNT" | "PERCENT" | null,
  discountValue: number
) {
  const subtotal = items.reduce((s, i) => s + i.priceSnapshot * i.quantity, 0);
  const discountAmount = calcDiscount(subtotal, discountType, discountValue);
  return { subtotal, discountAmount, total: subtotal - discountAmount };
}
