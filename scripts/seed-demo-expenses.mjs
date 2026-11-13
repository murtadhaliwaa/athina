import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env", override: false });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
/** وسم داخلي بالعربي لحذف بيانات المعاينة وإعادة زرعها */
const DEMO_NOTE = "بيانات معاينة";

function baghdadYmd(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
  }).format(d);
}

function addDaysYmd(ymd, days) {
  const d = new Date(`${ymd}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
  }).format(d);
}

function clampToMonth(ymd, monthStart, monthEnd) {
  if (ymd < monthStart) return monthStart;
  if (ymd > monthEnd) return monthEnd;
  return ymd;
}

function toBusinessDate(ymd) {
  return new Date(`${ymd}T12:00:00.000Z`);
}

function monthBounds(ymd) {
  const [y, m] = ymd.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function prevMonthYmd(ymd) {
  const [y, m] = ymd.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 15));
  const py = d.getUTCFullYear();
  const pm = d.getUTCMonth() + 1;
  return `${py}-${String(pm).padStart(2, "0")}-15`;
}

const owner =
  (await prisma.profile.findFirst({
    where: { role: "OWNER", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true },
  })) ?? null;

if (!owner) {
  throw new Error("ماكو حساب مالك فعّال — سجّل مالك أولاً");
}

const today = baghdadYmd();
const thisMonth = monthBounds(today);
const lastMonthAnchor = prevMonthYmd(today);
const lastMonth = monthBounds(lastMonthAnchor);

/** قوالب واقعية للكوفي — تُوزَّع على الشهرين */
const templates = [
  { title: "حليب طازج", category: "supplies", amount: 35_000, note: "صناديق للمقهى" },
  { title: "ثلج", category: "supplies", amount: 12_000, note: "كيسين" },
  { title: "غاز أركيلة", category: "supplies", amount: 45_000, note: null },
  { title: "فحم أركيلة", category: "supplies", amount: 28_000, note: "كرتون" },
  { title: "سكر ومواد تحلية", category: "supplies", amount: 22_000, note: null },
  { title: "مناديل ومستهلكات", category: "other", amount: 18_000, note: "طلبية صغيرة" },
  { title: "أكواب ورقية", category: "supplies", amount: 40_000, note: "حجم وسط وكبير" },
  { title: "عصائر مركزات", category: "supplies", amount: 55_000, note: null },
  { title: "قهوة مطحونة", category: "supplies", amount: 85_000, note: "إسبريسو" },
  { title: "شاي ونعنع", category: "supplies", amount: 15_000, note: null },
  { title: "صيانة مكينة قهوة", category: "maintenance", amount: 75_000, note: "تنظيف دوري" },
  { title: "تصليح ثلاجة", category: "maintenance", amount: 60_000, note: "غاز وتبريد" },
  { title: "إنترنت الشهر", category: "utilities", amount: 50_000, note: null },
  { title: "كهرباء / مولدة", category: "utilities", amount: 120_000, note: "حصة المولدة" },
  { title: "ماء شرب للموظفين", category: "utilities", amount: 10_000, note: null },
  { title: "منظفات", category: "other", amount: 14_000, note: "أرضيات ومطبخ" },
  { title: "طباعة قوائم", category: "other", amount: 25_000, note: null },
  { title: "نقل ومشاوير", category: "other", amount: 20_000, note: "توصيل مواد" },
  { title: "فواكه أركيلة", category: "supplies", amount: 32_000, note: "تفاح وبرتقال" },
  { title: "حليب نباتي", category: "supplies", amount: 30_000, note: "لوز وشوفان" },
];

function buildMonthSamples(monthStart, monthEnd, dayOffsets) {
  return templates.map((t, i) => {
    const offset = dayOffsets[i % dayOffsets.length];
    const raw = addDaysYmd(monthEnd, -offset);
    const businessDate = clampToMonth(raw, monthStart, monthEnd);
    return {
      title: t.title,
      category: t.category,
      amount: t.amount + (i % 3) * 1_000,
      note: t.note ? `${t.note} · ${DEMO_NOTE}` : DEMO_NOTE,
      businessDate: toBusinessDate(businessDate),
      createdById: owner.id,
    };
  });
}

const thisMonthOffsets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const lastMonthOffsets = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26];

const samples = [
  ...buildMonthSamples(thisMonth.start, today < thisMonth.end ? today : thisMonth.end, thisMonthOffsets),
  ...buildMonthSamples(lastMonth.start, lastMonth.end, lastMonthOffsets),
];

await prisma.expense.deleteMany({
  where: {
    OR: [
      { note: { contains: DEMO_NOTE } },
      { note: { contains: "__demo_expense__" } },
    ],
  },
});

await prisma.expense.createMany({ data: samples });

const thisTotal = samples
  .filter((s) => {
    const d = s.businessDate.toISOString().slice(0, 10);
    return d >= thisMonth.start && d <= thisMonth.end;
  })
  .reduce((sum, s) => sum + s.amount, 0);

const lastTotal = samples
  .filter((s) => {
    const d = s.businessDate.toISOString().slice(0, 10);
    return d >= lastMonth.start && d <= lastMonth.end;
  })
  .reduce((sum, s) => sum + s.amount, 0);

console.log(
  `OK — ${samples.length} مصروف تجريبي للمالك «${owner.fullName}»`,
);
console.log(
  `هذا الشهر (${thisMonth.start} → ${today}): ${thisTotal.toLocaleString("en-US")} د.ع`,
);
console.log(
  `الشهر الفات (${lastMonth.start} → ${lastMonth.end}): ${lastTotal.toLocaleString("en-US")} د.ع`,
);

await prisma.$disconnect();
