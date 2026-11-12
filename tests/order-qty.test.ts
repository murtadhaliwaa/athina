import { describe, expect, it } from "vitest";
import { nextOrderItemQty } from "@/lib/orders/qty";

describe("nextOrderItemQty", () => {
  it("يزيد وينقص ضمن الحد", () => {
    expect(nextOrderItemQty(2, 1)).toBe(3);
    expect(nextOrderItemQty(2, -1)).toBe(1);
    expect(nextOrderItemQty(99, 1)).toBe(99);
  });

  it("الوصول لصفر يعني حذف", () => {
    expect(nextOrderItemQty(1, -1)).toBe(0);
    expect(nextOrderItemQty(3, -5)).toBe(0);
  });
});
