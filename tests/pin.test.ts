import { describe, expect, it } from "vitest";
import { derivePasswordWithPepper } from "@/lib/auth/pin-crypto";

const pepper = "test-pepper-please-change-in-prod-32chars";

describe("derivePasswordWithPepper", () => {
  it("ثابتة لنفس المدخلات", () => {
    const a = derivePasswordWithPepper("ahmed", "123456", pepper);
    const b = derivePasswordWithPepper("ahmed", "123456", pepper);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("تتغير بتغيير أي مدخل", () => {
    const base = derivePasswordWithPepper("ahmed", "123456", pepper);
    expect(derivePasswordWithPepper("ali", "123456", pepper)).not.toBe(base);
    expect(derivePasswordWithPepper("ahmed", "654321", pepper)).not.toBe(base);
    expect(derivePasswordWithPepper("ahmed", "123456", pepper + "x")).not.toBe(
      base
    );
  });
});
