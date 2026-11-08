/**
 * طلبات/طاولات تجريبية لشاشة الكابتن
 * تشغيل: node scripts/seed-waiter-demo.mjs
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const prisma = new PrismaClient();

function getBusinessDate(now = new Date(), startHour = 5) {
  const shifted = new Date(now.getTime() - startHour * 3600_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(
    shifted
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
    settings?.businessDayStartHour ?? 5
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
    take: 6,
  });
  const items = await prisma.menuItem.findMany({
    where: { isActive: true, isAvailable: true },
    include: { category: { select: { name: true } } },
    orderBy: { sortOrder: "asc" },
    take: 16,
  });
  if (tables.length < 4 || items.length < 6) {
    throw new Error("طاولات/منيو غير كافية");
  }

  // امسح طلبات demo لهذا اليوم + أغلق أي فاتورة مفتوحة على الطاولات المستهدفة
  const oldDemo = await prisma.order.findMany({
    where: { note: "demo-seed" },
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
    console.log(`حذفنا ${oldDemo.length} طلب demo قديم`);
  }

  const targetTableIds = tables.slice(0, 6).map((t) => t.id);
  const leftoverOpen = await prisma.bill.findMany({
    where: { status: "OPEN", tableId: { in: targetTableIds } },
    select: { id: true },
  });
  if (leftoverOpen.length) {
    const ids = leftoverOpen.map((b) => b.id);
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
    console.log(`حرّرنا ${ids.length} فاتورة مفتوحة على الطاولات`);
  }

  const scenarios = [
    {
      status: "NEW",
      table: tables[0],
      pick: [0, 1],
      note: "بدون سكر",
    },
    {
      status: "PREPARING",
      table: tables[1],
      pick: [2, 3, 4],
    },
    {
      status: "READY",
      table: tables[2],
      pick: [5, 6],
    },
    {
      status: "NEW",
      table: tables[3],
      pick: [1, 7, 8],
    },
    {
      status: "READY",
      table: tables[4],
      pick: [0, 2],
    },
    {
      status: "SERVED",
      table: tables[5],
      pick: [3],
      followUp: true,
    },
  ];

  let created = 0;
  for (const s of scenarios) {
    await prisma.$transaction(async (tx) => {
      let bill = await tx.bill.findFirst({
        where: { tableId: s.table.id, status: "OPEN" },
      });
      if (!bill) {
        bill = await tx.bill.create({
          data: {
            type: "DINE_IN",
            tableId: s.table.id,
            status: "OPEN",
            businessDate: businessDateObj,
            shiftId: shift.id,
          },
        });
      }

      const dailyNumber = await nextDailyNumber(tx, businessDate);
      const lines = s.pick.map((idx) => items[idx % items.length]);
      const now = new Date();

      await tx.order.create({
        data: {
          businessDate: businessDateObj,
          dailyNumber,
          billId: bill.id,
          tableId: s.table.id,
          type: "DINE_IN",
          status: s.status,
          note: "demo-seed",
          isFollowUp: Boolean(s.followUp),
          shiftId: shift.id,
          createdById: waiter.id,
          preparingAt: ["PREPARING", "READY", "SERVED"].includes(s.status)
            ? now
            : null,
          readyAt: ["READY", "SERVED"].includes(s.status) ? now : null,
          servedAt: s.status === "SERVED" ? now : null,
          items: {
            create: lines.map((it, i) => ({
              menuItemId: it.id,
              nameSnapshot: it.name,
              categorySnapshot: it.category?.name ?? "—",
              priceSnapshot: it.price,
              quantity: 1 + (i % 2),
              note: i === 0 ? s.note ?? null : null,
              addedById: waiter.id,
            })),
          },
        },
        include: { items: true },
      });

      const existing = await tx.orderItem.findMany({
        where: { order: { billId: bill.id, status: { not: "CANCELLED" } } },
        select: { priceSnapshot: true, quantity: true },
      });
      const subtotal = existing.reduce(
        (sum, i) => sum + i.priceSnapshot * i.quantity,
        0
      );
      await tx.bill.update({
        where: { id: bill.id },
        data: { subtotal, total: subtotal, discountAmount: 0 },
      });
    });
    created++;
  }

  console.log(
    JSON.stringify(
      {
        businessDate,
        created,
        openOrders: await prisma.order.count({
          where: {
            businessDate: businessDateObj,
            status: { in: ["NEW", "PREPARING", "READY"] },
          },
        }),
        openBills: await prisma.bill.count({ where: { status: "OPEN" } }),
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
