import { describe, expect, it } from "vitest";
import {
  areBillOrdersReady,
  isOrderStillPreparing,
} from "@/lib/orders/bill-ready";

describe("areBillOrdersReady", () => {
  it("فارغة = غير جاهزة", () => {
    expect(areBillOrdersReady([])).toBe(false);
  });

  it("كل READY = جاهزة", () => {
    expect(areBillOrdersReady(["READY"])).toBe(true);
    expect(areBillOrdersReady(["READY", "READY"])).toBe(true);
  });

  it("كل SERVED = جاهزة", () => {
    expect(areBillOrdersReady(["SERVED"])).toBe(true);
    expect(areBillOrdersReady(["SERVED", "SERVED"])).toBe(true);
  });

  it("خليط READY و SERVED = جاهزة", () => {
    expect(areBillOrdersReady(["READY", "SERVED"])).toBe(true);
  });

  it("وجود NEW أو PREPARING = غير جاهزة", () => {
    expect(areBillOrdersReady(["READY", "NEW"])).toBe(false);
    expect(areBillOrdersReady(["SERVED", "PREPARING"])).toBe(false);
    expect(areBillOrdersReady(["NEW"])).toBe(false);
  });
});

describe("isOrderStillPreparing", () => {
  it("يميز حالات التحضير", () => {
    expect(isOrderStillPreparing("NEW")).toBe(true);
    expect(isOrderStillPreparing("PREPARING")).toBe(true);
    expect(isOrderStillPreparing("READY")).toBe(false);
    expect(isOrderStillPreparing("SERVED")).toBe(false);
    expect(isOrderStillPreparing("CANCELLED")).toBe(false);
  });
});
