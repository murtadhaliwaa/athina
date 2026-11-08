import { describe, expect, it } from "vitest";
import { calcDiscount, calcTotals } from "@/lib/billing/calc";

describe("calcDiscount", () => {
  it("خصم مبلغ ثابت", () => {
    expect(calcDiscount(10000, "AMOUNT", 1000)).toBe(1000);
  });

  it("خصم نسبة مع تقريب 250", () => {
    expect(calcDiscount(10000, "PERCENT", 10)).toBe(1000);
  });

  it("تقريب النسبة لخطوة 250 للأسفل عند المنتصف الأدنى", () => {
    // 1% من 10000 = 100 → أقرب مضاعف 250 هو 0
    expect(calcDiscount(10000, "PERCENT", 1)).toBe(0);
  });

  it("تقريب النسبة لخطوة 250 للأعلى", () => {
    // 3% من 10000 = 300 → 250
    expect(calcDiscount(10000, "PERCENT", 3)).toBe(250);
  });

  it("خصم كامل مسموح ولا يتجاوز المجموع", () => {
    expect(calcDiscount(5000, "AMOUNT", 5000)).toBe(5000);
    expect(calcDiscount(500, "AMOUNT", 1000)).toBe(500);
  });

  it("بدون نوع يرجع صفر", () => {
    expect(calcDiscount(10000, null, 100)).toBe(0);
  });
});

describe("calcTotals", () => {
  it("يحسب المجموع والخصم", () => {
    const result = calcTotals(
      [
        { priceSnapshot: 2000, quantity: 2 },
        { priceSnapshot: 1500, quantity: 1 },
      ],
      "AMOUNT",
      500
    );
    expect(result.subtotal).toBe(5500);
    expect(result.discountAmount).toBe(500);
    expect(result.total).toBe(5000);
  });

  it("خصم 100% يصفّر الإجمالي مع بقاء الأصناف", () => {
    const result = calcTotals(
      [{ priceSnapshot: 2000, quantity: 2 }],
      "PERCENT",
      100
    );
    expect(result.subtotal).toBe(4000);
    expect(result.discountAmount).toBe(4000);
    expect(result.total).toBe(0);
  });
});
