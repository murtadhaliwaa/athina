import { describe, expect, it } from "vitest";
import {
  isOfferWindowOpen,
  parseTimeToMinute,
  minuteToTimeInput,
} from "@/lib/offers/window";

/** تاريخ UTC يوافق ساعة بغداد = utcHour+3 تقريباً شتاءً؛ نثبّت بإزاحة صريحة */
function atBaghdad(hour: number, minute = 0) {
  // بغداد UTC+3: 12:00 بغداد = 09:00 UTC
  return new Date(Date.UTC(2026, 10, 13, hour - 3, minute, 0));
}

describe("offer window", () => {
  const start = 12 * 60; // 12:00
  const end = 18 * 60; // 18:00

  it("مفتوح داخل النافذة", () => {
    expect(isOfferWindowOpen(start, end, atBaghdad(12, 0))).toBe(true);
    expect(isOfferWindowOpen(start, end, atBaghdad(15, 30))).toBe(true);
    expect(isOfferWindowOpen(start, end, atBaghdad(17, 59))).toBe(true);
  });

  it("مغلق قبل وبعد وبحد النهاية", () => {
    expect(isOfferWindowOpen(start, end, atBaghdad(11, 59))).toBe(false);
    expect(isOfferWindowOpen(start, end, atBaghdad(18, 0))).toBe(false);
    expect(isOfferWindowOpen(start, end, atBaghdad(20, 0))).toBe(false);
  });

  it("يرفض نافذة غير صالحة أو عبور منتصف الليل", () => {
    expect(isOfferWindowOpen(18 * 60, 12 * 60, atBaghdad(20))).toBe(false);
    expect(isOfferWindowOpen(12 * 60, 12 * 60, atBaghdad(12))).toBe(false);
  });

  it("parseTimeToMinute و minuteToTimeInput", () => {
    expect(parseTimeToMinute("12:00")).toBe(720);
    expect(parseTimeToMinute("18:30")).toBe(18 * 60 + 30);
    expect(parseTimeToMinute("25:00")).toBeNull();
    expect(minuteToTimeInput(870)).toBe("14:30");
  });
});
