import { getBusinessDate, TZ } from "@/lib/time";

export type ReportPreset = "today" | "yesterday" | "last7" | "thisMonth" | "custom";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T12:00:00.000Z`);
  return !Number.isNaN(d.getTime());
}

/** إضافة أيام على YYYY-MM-DD بتوقيت بغداد */
export function addCalendarDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

export function resolveReportRange(
  preset: ReportPreset,
  customFrom: string | undefined,
  customTo: string | undefined,
  startHour: number,
  now = new Date()
): { from: string; to: string } {
  const today = getBusinessDate(now, startHour);

  if (preset === "today") return { from: today, to: today };
  if (preset === "yesterday") {
    const y = addCalendarDays(today, -1);
    return { from: y, to: y };
  }
  if (preset === "last7") {
    return { from: addCalendarDays(today, -6), to: today };
  }
  if (preset === "thisMonth") {
    const [y, m] = today.split("-").map(Number);
    const from = `${y}-${String(m).padStart(2, "0")}-01`;
    return { from, to: today };
  }

  let from = customFrom && isValidDateString(customFrom) ? customFrom : today;
  let to = customTo && isValidDateString(customTo) ? customTo : today;
  if (from > to) [from, to] = [to, from];
  return { from, to };
}

/** بداية/نهاية يوم تقويمي في بغداد لاستعلامات DateTime */
export function baghdadDayStart(iso: string): Date {
  return new Date(`${iso}T00:00:00+03:00`);
}

export function baghdadDayEnd(iso: string): Date {
  return new Date(`${iso}T23:59:59.999+03:00`);
}
