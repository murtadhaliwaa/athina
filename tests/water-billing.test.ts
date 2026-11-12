import { describe, expect, it } from "vitest";
import {
  clampWaterQty,
  DEFAULT_WATER_QTY,
  isWaterItemName,
} from "@/lib/billing/water-constants";

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

describe("water defaults", () => {
  it("الكمية الافتراضية واحد", () => {
    expect(DEFAULT_WATER_QTY).toBe(1);
  });

  it("يتعرّف على اسم الماء", () => {
    expect(isWaterItemName("ماء")).toBe(true);
    expect(isWaterItemName(" قهوة ")).toBe(false);
  });
});
