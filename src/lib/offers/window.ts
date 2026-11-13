import { TZ } from "@/lib/time";

/** دقيقة اليوم بتوقيت بغداد (0–1439) */
export function getBaghdadMinuteOfDay(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/**
 * نافذة يومية بدون عبور منتصف الليل.
 * مفتوحة عندما startMinute <= الآن < endMinute
 */
export function isOfferWindowOpen(
  startMinute: number,
  endMinute: number,
  now = new Date(),
): boolean {
  if (
    !Number.isFinite(startMinute) ||
    !Number.isFinite(endMinute) ||
    startMinute < 0 ||
    endMinute > 1439 ||
    startMinute >= endMinute
  ) {
    return false;
  }
  const m = getBaghdadMinuteOfDay(now);
  return m >= startMinute && m < endMinute;
}

/** "14:30" → 870 */
export function parseTimeToMinute(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function minuteToTimeInput(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** عرض عربي قصير: ٦:٠٠ م — ص/م يسار الرقم بصرياً داخل RTL (بدون عزل LTR) */
export function formatMinuteAr(minute: number): string {
  const h24 = Math.floor(minute / 60);
  const m = minute % 60;
  const period = h24 < 12 ? "ص" : "م";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const mm = String(m).padStart(2, "0");
  // RLM بعد الرقم يدفع ص/م لتبقى يسار العدد في واجهة عربية
  return `${h12}:${mm}\u200F ${period}`;
}

export function formatOfferWindowLabel(
  startMinute: number,
  endMinute: number,
): string {
  return `${formatMinuteAr(startMinute)} – ${formatMinuteAr(endMinute)}`;
}
