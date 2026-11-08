/**
 * 3 فواتير مفتوحة لشاشة الكاشير
 * تشغيل: node scripts/seed-open-bills.mjs
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const prisma = new PrismaClient();

function getBusinessDate(now = new Date(), startHour = 5) {
  const shifted = new Date(now.getTime() - startHour * 3600_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(
    shifted,
  );
}

function parseBusinessDate(iso) {
  return new Date(`${iso}T00:00:00.000Z`);
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
  const businessDate = getBusinessDate(
    new Date(),
    settings?.businessDayStartHour ?? 5,
  );
  const businessDateObj = parseBusinessDate(businessDate);

  const waiter = await prisma.profile.findUnique({
    where: { username: "waiter1" },
  });
  const cashier = await prisma.profile.findUnique({
    where: { username: "cashier1" },
  });
  if (!waiter || !cashier) {
    throw new Error("الموظفون غير موجودين — شغّل npm run db:seed أولاً");
  }

  let shift = await prisma.shift.findFirst({ where: { closedAt: null } });
  if (!shift) {
    shift = await prisma.shift.create({
      data: { openedById: cashier.id, openingCash: 150_000 },
    });
    console.log("فتحنا شفت");
  }

  const tables = await prisma.cafeTable.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 3,
  });
  const items = await prisma.menuItem.findMany({
    where: { isActive: true, isAvailable: true },
    include: { category: { select: { name: true } } },
    orderBy: { sortOrder: "asc" },
    take: 12,
  });
  if (tables.length < 3 || items.length < 4) {
    throw new Error("طاولات/منيو غير كافية");
  }

  // امسح فواتير demo السابقة فقط
  const oldDemo = await prisma.order.findMany({
    where: { note: "demo-open-bills" },
    select: { id: true, billId: true },
  });
  if (oldDemo.length) {
    const billIds = [...new Set(oldDemo.map((o) => o.billId))];
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: oldDemo.map((o) => o.id) } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: oldDemo.map((o) => o.id) } },
    });
    await prisma.payment.deleteMany({ where: { billId: { in: billIds } } });
    await prisma.bill.deleteMany({ where: { id: { in: billIds } } });
  }

  const tableIds = tables.map((t) => t.id);
  const leftover = await prisma.bill.findMany({
    where: { status: "OPEN", tableId: { in: tableIds } },
    select: { id: true },
  });
  if (leftover.length) {
    const ids = leftover.map((b) => b.id);
    const ordersOn = await prisma.order.findMany({
      where: { billId: { in: ids } },
      select: { id: true },
    });
    if (ordersOn.length) {
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: ordersOn.map((o) => o.id) } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: ordersOn.map((o) => o.id) } },
      });
    }
    await prisma.payment.deleteMany({ where: { billId: { in: ids } } });
    await prisma.bill.deleteMany({ where: { id: { in: ids } } });
  }

  const scenarios = [
    { status: "READY", table: tables[0], pick: [0, 1], qty: [2, 1] },
    { status: "PREPARING", table: tables[1], pick: [2, 3, 4], qty: [1, 2, 1] },
    { status: "NEW", table: tables[2], pick: [5, 6], qty: [1, 3] },
  ];

  const created = [];
  for (const s of scenarios) {
    const billId = await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.create({
        data: {
          type: "DINE_IN",
          tableId: s.table.id,
          status: "OPEN",
          businessDate: businessDateObj,
          shiftId: shift.id,
        },
      });

      const dailyNumber = await nextDailyNumber(tx, businessDate);
      const now = new Date();
      const lines = s.pick.map((idx, i) => ({
        item: items[idx % items.length],
        quantity: s.qty[i] ?? 1,
      }));

      await tx.order.create({
        data: {
          businessDate: businessDateObj,
          dailyNumber,
          billId: bill.id,
          tableId: s.table.id,
          type: "DINE_IN",
          status: s.status,
          note: "demo-open-bills",
          shiftId: shift.id,
          createdById: waiter.id,
          preparingAt: ["PREPARING", "READY", "SERVED"].includes(s.status)
            ? now
            : null,
          readyAt: ["READY", "SERVED"].includes(s.status) ? now : null,
          items: {
            create: lines.map(({ item, quantity }, i) => ({
              menuItemId: item.id,
              nameSnapshot: item.name,
              categorySnapshot: item.category?.name ?? "—",
              priceSnapshot: item.price,
              quantity,
              note: i === 0 ? "تجريبي" : null,
              addedById: waiter.id,
            })),
          },
        },
      });

      const existing = await tx.orderItem.findMany({
        where: {
          status: "ACTIVE",
          order: { billId: bill.id, status: { not: "CANCELLED" } },
        },
        select: { priceSnapshot: true, quantity: true },
      });
      const subtotal = existing.reduce(
        (sum, i) => sum + i.priceSnapshot * i.quantity,
        0,
      );
      await tx.bill.update({
        where: { id: bill.id },
        data: { subtotal, total: subtotal, discountAmount: 0 },
      });

      return bill.id;
    }, { maxWait: 15_000, timeout: 30_000 });

    created.push({
      billId,
      table: s.table.label,
      status: s.status,
    });
  }

  console.log(
    JSON.stringify({ businessDate, openBills: created.length, created }, null, 2),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
