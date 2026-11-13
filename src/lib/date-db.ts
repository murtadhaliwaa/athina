import { TZ } from "@/lib/time";

/** تحويل YYYY-MM-DD إلى Date لحقول @db.Date في Prisma */
export function parseBusinessDate(iso: string): Date {
  return new Date(`${iso}T12:00:00.000Z`);
}

/**
 * قراءة حقل @db.Date من Prisma كـ YYYY-MM-DD بتوقيت بغداد.
 * تجنّب toISOString().slice — يرجّع اليوم السابق على خوادم UTC+3.
 */
export function businessDateToIso(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}
