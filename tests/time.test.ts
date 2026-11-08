import { describe, expect, it } from "vitest";
import {
  formatBaghdadDate,
  formatBaghdadDateTime,
  formatBaghdadDayMonth,
  formatBaghdadTime,
  getBusinessDate,
} from "@/lib/time";

describe("getBusinessDate", () => {
  it("قبل الساعة 5 يبقى اليوم السابق", () => {
    // 2026-03-15 04:30 Asia/Baghdad = 2026-03-15 01:30 UTC
    const now = new Date("2026-03-15T01:30:00.000Z");
    expect(getBusinessDate(now, 5)).toBe("2026-03-14");
  });

  it("بعد الساعة 5 يبدأ يوم العمل الحالي", () => {
    // 2026-03-15 05:00 Asia/Baghdad = 2026-03-15 02:00 UTC
    const now = new Date("2026-03-15T02:00:00.000Z");
    expect(getBusinessDate(now, 5)).toBe("2026-03-15");
  });
});

describe("تنسيق تاريخ بغداد", () => {
  const morning = new Date("2026-11-06T05:35:00.000Z");

  it("السنة ثم الشهر ثم اليوم بلا علامة عكس", () => {
    const s = formatBaghdadDate("2026-11-06");
    expect(s).toContain("2026/11/6");
    expect(s).not.toContain("\u200f");
  });

  it("الشهر واليوم فقط للمخطط", () => {
    expect(formatBaghdadDayMonth("2026-11-06")).toContain("11/6");
  });

  it("الوقت أرقام غربية وص قبل الرقم في النص", () => {
    const s = formatBaghdadTime(morning);
    expect(s).toMatch(/ص 8:35/);
    expect(s.indexOf("ص")).toBeLessThan(s.indexOf("8:35"));
    expect(s.startsWith("\u202D")).toBe(true);
    expect(s.endsWith("\u202C")).toBe(true);
  });

  it("التاريخ يسبق الوقت", () => {
    const s = formatBaghdadDateTime(morning);
    expect(s.indexOf("2026/11/6")).toBeGreaterThanOrEqual(0);
    expect(s.indexOf("2026/11/6")).toBeLessThan(s.indexOf("ص"));
    expect(s.indexOf("ص")).toBeLessThan(s.indexOf("8:35"));
  });
});
