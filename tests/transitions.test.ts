import { describe, expect, it } from "vitest";
import {
  canAdvance,
  canRevert,
  nextStatus,
  prevStatus,
} from "@/lib/orders/transitions";

describe("order status transitions", () => {
  it("advances forward through served", () => {
    expect(nextStatus("NEW")).toBe("PREPARING");
    expect(nextStatus("PREPARING")).toBe("READY");
    expect(nextStatus("READY")).toBe("SERVED");
    expect(nextStatus("SERVED")).toBeNull();
    expect(canAdvance("READY")).toBe(true);
    expect(canAdvance("SERVED")).toBe(false);
  });

  it("reverts backward", () => {
    expect(prevStatus("PREPARING")).toBe("NEW");
    expect(prevStatus("READY")).toBe("PREPARING");
    expect(prevStatus("SERVED")).toBe("READY");
    expect(prevStatus("NEW")).toBeNull();
    expect(canRevert("SERVED")).toBe(true);
  });

  it("cancelled cannot move", () => {
    expect(canAdvance("CANCELLED")).toBe(false);
    expect(canRevert("CANCELLED")).toBe(false);
  });
});
