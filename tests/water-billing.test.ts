import { describe, expect, it } from "vitest";
import { clampWaterQty } from "@/lib/billing/water";

describe("clampWaterQty", () => {
  it("يقيد الكمية بعدد الجالسين", () => {
    expect(clampWaterQty(5, 5)).toBe(5);
    expect(clampWaterQty(8, 5)).toBe(5);
    expect(clampWaterQty(0, 5)).toBe(0);
    expect(clampWaterQty(-2, 5)).toBe(0);
  });

  it("بدون عدد جالسين يسمح حتى 50", () => {
    expect(clampWaterQty(12, null)).toBe(12);
    expect(clampWaterQty(99, null)).toBe(50);
  });

  it("يقرّب للأسفل", () => {
    expect(clampWaterQty(3.9, 10)).toBe(3);
  });
});
