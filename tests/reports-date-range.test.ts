import { describe, expect, it } from "vitest";
import { addCalendarDays, resolveReportRange } from "@/lib/reports/date-range";

describe("resolveReportRange", () => {
  const now = new Date("2026-03-15T10:00:00+03:00");

  it("اليوم", () => {
    expect(resolveReportRange("today", undefined, undefined, 5, now)).toEqual({
      from: "2026-03-15",
      to: "2026-03-15",
    });
  });

  it("أمس", () => {
    expect(resolveReportRange("yesterday", undefined, undefined, 5, now)).toEqual({
      from: "2026-03-14",
      to: "2026-03-14",
    });
  });

  it("آخر 7 أيام", () => {
    expect(resolveReportRange("last7", undefined, undefined, 5, now)).toEqual({
      from: "2026-03-09",
      to: "2026-03-15",
    });
  });

  it("هذا الشهر", () => {
    expect(resolveReportRange("thisMonth", undefined, undefined, 5, now)).toEqual({
      from: "2026-03-01",
      to: "2026-03-15",
    });
  });

  it("مخصّص — يصحّح الترتيب", () => {
    expect(
      resolveReportRange("custom", "2026-03-20", "2026-03-10", 5, now)
    ).toEqual({ from: "2026-03-10", to: "2026-03-20" });
  });
});

describe("addCalendarDays", () => {
  it("يضيف يوماً", () => {
    expect(addCalendarDays("2026-03-15", 1)).toBe("2026-03-16");
  });
});
