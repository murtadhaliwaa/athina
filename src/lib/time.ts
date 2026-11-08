export const TZ = "Asia/Baghdad";

/** عربي عراقي بأسماء الشهور، وأرقام غربية 0-9 دائماً */
const AR_IQ_LATN = "ar-IQ-u-nu-latn";

/** ar-IQ يضع علامة RTL قبل «/» فينعكس التاريخ إلى 2026 في الوسط */
const BIDI_CONTROLS = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

function stripBidi(s: string): string {
  return s.replace(BIDI_CONTROLS, "");
}

/** يعزل الرقم كاتجاه إنجليزي حتى لا ينعكس داخل النص العربي */
function ltr(s: string): string {
  return `\u2066${s}\u2069`;
}

function ymd(d: Date): { day: string; month: string; year: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const pick = (type: "day" | "month" | "year") =>
    parts.find((p) => p.type === type)?.value ?? "";
  return { day: pick("day"), month: pick("month"), year: pick("year") };
}

/** 2026/11/6 — بدون أصفار زائدة على اليوم */
function numericDate(d: Date): string {
  const { day, month, year } = ymd(d);
  return `${year}/${month}/${String(parseInt(day, 10))}`;
}

function timeClockAndPeriod(d: Date): { clock: string; period: string } {
  const parts = new Intl.DateTimeFormat(AR_IQ_LATN, {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  const period = stripBidi(
    parts.find((p) => p.type === "dayPeriod")?.value ?? "",
  );
  return { clock: `${hour}:${minute}`, period };
}

/** أجزاء الوقت للعرض المنفصل (ص ثم الساعة) */
export function formatBaghdadTimeParts(d: Date): {
  period: string;
  clock: string;
} {
  return timeClockAndPeriod(d);
}

/**
 * ص على يسار الرقم بصرياً (حتى داخل صفحة RTL).
 * LRE/PDF يفرض ترتيب الأحرف كما كُتبت.
 */
function arabicTime(d: Date): string {
  const { clock, period } = timeClockAndPeriod(d);
  return `\u202D${period} ${clock}\u202C`;
}

/** يرجع 'YYYY-MM-DD' ليوم العمل (يبدأ عند startHour صباحاً بتوقيت بغداد) */
export function getBusinessDate(now = new Date(), startHour = 5): string {
  const shifted = new Date(now.getTime() - startHour * 3600_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(shifted);
}

export function formatBaghdadDateTime(d: Date): string {
  const { clock, period } = timeClockAndPeriod(d);
  return `\u202D${numericDate(d)} ${period} ${clock}\u202C`;
}

export function formatBaghdadDateOnly(d: Date): string {
  return ltr(numericDate(d));
}

export function formatBaghdadDate(iso: string): string {
  return formatBaghdadDateOnly(new Date(`${iso}T12:00:00+03:00`));
}

/** 11/6 لتسميات المخطط القصيرة */
export function formatBaghdadDayMonth(iso: string): string {
  const { day, month } = ymd(new Date(`${iso}T12:00:00+03:00`));
  return ltr(`${month}/${String(parseInt(day, 10))}`);
}

/** مثال: الخميس 29 تشرين الأول */
export function formatBaghdadDateLong(iso: string): string {
  const d = new Date(`${iso}T12:00:00+03:00`);
  return stripBidi(
    new Intl.DateTimeFormat(AR_IQ_LATN, {
      timeZone: TZ,
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(d),
  );
}

export function formatBaghdadTime(d: Date): string {
  return arabicTime(d);
}

/** تسمية ساعة قصيرة للمخطط: 4م / 12ص */
export function formatHourShort(hour: number): string {
  if (hour === 0) return "12ص";
  if (hour === 12) return "12م";
  if (hour < 12) return `${hour}ص`;
  return `${hour - 12}م`;
}

export function getBaghdadHour(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  return parseInt(h, 10);
}
