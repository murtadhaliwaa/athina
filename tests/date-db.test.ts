import { describe, expect, it } from "vitest";
import { businessDateToIso, parseBusinessDate } from "@/lib/date-db";

describe("businessDateToIso", () => {
  it("لا يرجّع اليوم السابق لتاريخ DATE عند منتصف ليل بغداد", () => {
    // محاكاة سائق يعيد منتصف ليل بغداد كتوقيت UTC
    const baghdadMidnightAsUtc = new Date("2026-11-12T21:00:00.000Z");
    expect(businessDateToIso(baghdadMidnightAsUtc)).toBe("2026-11-13");
  });

  it("يتوافق مع parseBusinessDate", () => {
    const stored = parseBusinessDate("2026-11-13");
    expect(businessDateToIso(stored)).toBe("2026-11-13");
  });
});
