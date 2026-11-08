import { t } from "@/lib/i18n/ar-iq";

export { formatBaghdadDateTime } from "@/lib/time";

export function formatOrderNumber(n: number) {
  return `#${String(n).padStart(3, "0")}`;
}

/** وقت نسبي قصير لشاشات الكابتن (دقائق) */
export function formatMinsAgo(date: Date, now = new Date()) {
  const mins = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 60_000)
  );
  if (mins < 1) return t("time.justNow");
  if (mins === 1) return t("time.oneMin");
  return t("time.minsAgo", { n: mins });
}

export function formatMinsShort(date: Date, now = new Date()) {
  const mins = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 60_000)
  );
  return t("tables.minsShort", { n: Math.max(1, mins) });
}
