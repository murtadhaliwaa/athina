/**
 * فواتير مدفوعة تجريبية لتقارير المبيعات
 * تشغيل: node scripts/seed-sales-demo.mjs
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const runtimeUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL;
const prisma = new PrismaClient(
  runtimeUrl ? { datasources: { db: { url: runtimeUrl } } } : undefined
);

function getBusinessDate(now = new Date(), startHour = 5) {
  const shifted = new Date(now.getTime() - startHour * 3600_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(
    shifted
  );
}

function parseBusinessDate(iso) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function addDays(iso, days) {
  const d = new Date(`${iso}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
  }).format(d);
}

async function nextDailyNumber(tx, businessDate) {
  const rows = await tx.$queryRaw`
    INSERT INTO daily_counters ("businessDate", "lastNumber")
    VALUES (${businessDate}::date, 1)
    ON CONFLICT ("businessDate")
    DO UPDATE SET "lastNumber" = daily_counters."lastNumber" + 1
    RETURNING "lastNumber"`;
  return rows[0].lastNumber;
}

async function main() {
  const settings = await prisma.cafeSettings.findUnique({ where: { id: 1 } });
  const startHour = settings?.businessDayStartHour ?? 5;
  const today = getBusinessDate(new Date(), startHour);

  const cashier = await prisma.profile.findUnique({
    where: { username: "cashier1" },
  });
  const waiter = await prisma.profile.findUnique({
    where: { username: "waiter1" },
  });
  if (!cashier || !waiter) {
    throw new Error("الموظفون غير موجودين — شغّل npm run db:seed أولاً");
  }

  let shift = await prisma.shift.findFirst({ where: { closedAt: null } });
  if (!shift) {
    shift = await prisma.shift.create({
      data: { openedById: cashier.id, openingCash: 150_000 },
    });
  }

  const items = await prisma.menuItem.findMany({
    where: { isActive: true, isAvailable: true },
    include: { category: { select: { name: true } } },
    orderBy: { sortOrder: "asc" },
    take: 12,
  });
  if (items.length < 4) {
    throw new Error("المنيو فاضي — شغّل seed المنيو أولاً");
  }

  const tables = await prisma.cafeTable.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 4,
  });

  // امسح فواتير demo-sales فقط (لا نمس بيانات حقيقية)
  const old = await prisma.order.findMany({
    where: { note: "demo-sales" },
    select: { billId: true },
  });
  if (old.length) {
    const billIds = [...new Set(old.map((o) => o.billId))];
    await prisma.payment.deleteMany({ where: { billId: { in: billIds } } });
    await prisma.orderItem.deleteMany({
      where: { order: { billId: { in: billIds } } },
    });
    await prisma.order.deleteMany({ where: { billId: { in: billIds } } });
    await prisma.bill.deleteMany({ where: { id: { in: billIds } } });
    console.log(`حذفنا ${billIds.length} فاتورة demo-sales قديمة`);
  }

  /** أيام: اليوم، أمس، قبل يومين… مع عدة فواتير لكل يوم */
  const dayPlans = [
    {
      date: today,
      bills: [
        { picks: [0, 1], qty: [2, 1], discount: 0, hour: 9 },
        { picks: [2], qty: [2], discount: 0, hour: 10 },
        { picks: [3, 4], qty: [1, 2], discount: 0, hour: 11 },
        { picks: [2, 3, 4], qty: [1, 2, 1], discount: 1000, hour: 13 },
        { picks: [5, 0], qty: [1, 1], discount: 0, hour: 15 },
        { picks: [6], qty: [2], discount: 0, hour: 16 },
        { picks: [1, 6, 7], qty: [2, 1, 2], discount: 2500, hour: 18 },
        { picks: [0, 2], qty: [1, 2], discount: 0, hour: 19 },
        { picks: [3], qty: [3], discount: 0, hour: 20 },
        { picks: [5, 7], qty: [1, 1], discount: 500, hour: 21 },
      ],
    },
    {
      date: addDays(today, -1),
      bills: [
        { picks: [0, 2], qty: [1, 2], discount: 0, hour: 11 },
        { picks: [4, 5], qty: [1, 1], discount: 500, hour: 18 },
        { picks: [1, 3, 6], qty: [2, 1, 1], discount: 0, hour: 20 },
      ],
    },
    {
      date: addDays(today, -2),
      bills: [
        { picks: [7, 0], qty: [1, 2], discount: 0, hour: 12 },
        { picks: [2, 5], qty: [2, 2], discount: 1500, hour: 17 },
      ],
    },
  ];

  let created = 0;

  for (const day of dayPlans) {
    const businessDateObj = parseBusinessDate(day.date);
    for (let bi = 0; bi < day.bills.length; bi++) {
      const plan = day.bills[bi];
      const table = tables[bi % Math.max(tables.length, 1)];
      if (!table) continue;
      await prisma.$transaction(async (tx) => {
        const lines = plan.picks.map((idx, i) => {
          const it = items[idx % items.length];
          return {
            menuItemId: it.id,
            nameSnapshot: it.name,
            categorySnapshot: it.category.name,
            priceSnapshot: it.price,
            quantity: plan.qty[i] ?? 1,
            addedById: waiter.id,
          };
        });
        const subtotal = lines.reduce(
          (s, l) => s + l.priceSnapshot * l.quantity,
          0
        );
        const discountAmount = Math.min(plan.discount, subtotal);
        const total = subtotal - discountAmount;
        const mins = String((15 + bi * 3) % 60).padStart(2, "0");
        const paidAt = new Date(
          `${day.date}T${String(plan.hour).padStart(2, "0")}:${mins}:00+03:00`,
        );

        const bill = await tx.bill.create({
          data: {
            type: "DINE_IN",
            tableId: table.id,
            status: "PAID",
            businessDate: businessDateObj,
            shiftId: shift.id,
            subtotal,
            discountType: discountAmount > 0 ? "AMOUNT" : null,
            discountValue: discountAmount,
            discountAmount,
            discountReason: discountAmount > 0 ? "خصم تجريبي" : null,
            discountById: discountAmount > 0 ? cashier.id : null,
            total,
            paidAt,
            paidById: cashier.id,
            openedAt: paidAt,
          },
        });

        const dailyNumber = await nextDailyNumber(tx, day.date);
        await tx.order.create({
          data: {
            businessDate: businessDateObj,
            dailyNumber,
            billId: bill.id,
            tableId: bill.tableId,
            type: "DINE_IN",
            status: "SERVED",
            note: "demo-sales",
            shiftId: shift.id,
            createdById: waiter.id,
            createdAt: paidAt,
            preparingAt: paidAt,
            readyAt: paidAt,
            servedAt: paidAt,
            items: { create: lines },
          },
        });

        await tx.payment.create({
          data: {
            billId: bill.id,
            shiftId: shift.id,
            amount: total,
            receivedAmount: total + 1000,
            createdById: cashier.id,
            createdAt: paidAt,
          },
        });
      }, { maxWait: 20_000, timeout: 60_000 });
      created++;
    }
  }

  console.log(`أُنشئت ${created} فاتورة مدفوعة عبر ${dayPlans.length} أيام (اليوم=${today})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
