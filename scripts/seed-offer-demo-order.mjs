/**
 * طلب وهمي من العروض لشاشة الكاشير (يتجاوز نافذة الوقت)
 * تشغيل: node scripts/seed-offer-demo-order.mjs
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const prisma = new PrismaClient();
const DEMO_NOTE = "demo-offer-order";

function getBusinessDate(now = new Date(), startHour = 5) {
  const shifted = new Date(now.getTime() - startHour * 3600_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(
    shifted,
  );
}

function parseBusinessDate(iso) {
  return new Date(`${iso}T12:00:00.000Z`);
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

  const waiter =
    (await prisma.profile.findFirst({
      where: { role: "WAITER", isActive: true },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.profile.findFirst({
      where: { role: "OWNER", isActive: true },
    }));
  const cashier = await prisma.profile.findFirst({
    where: { role: "CASHIER", isActive: true },
  });
  if (!waiter) throw new Error("ماكو ويتر/مالك فعّال");
  if (!cashier) throw new Error("ماكو كاشير فعّال");

  let shift = await prisma.shift.findFirst({ where: { closedAt: null } });
  if (!shift) {
    shift = await prisma.shift.create({
      data: { openedById: cashier.id, openingCash: 100_000 },
    });
    console.log("فتحنا شفت");
  }

  const offers = await prisma.offer.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      components: { orderBy: { sortOrder: "asc" }, select: { label: true } },
      menuItem: {
        include: { category: { select: { name: true } } },
      },
    },
  });
  if (offers.length === 0) {
    throw new Error("ماكو عروض — شغّل node scripts/seed-athina-offers.mjs");
  }

  // امسح طلب العرض التجريبي السابق
  const old = await prisma.order.findMany({
    where: { note: DEMO_NOTE },
    select: { id: true, billId: true },
  });
  if (old.length) {
    const billIds = [...new Set(old.map((o) => o.billId))];
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: old.map((o) => o.id) } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: old.map((o) => o.id) } },
    });
    await prisma.payment.deleteMany({ where: { billId: { in: billIds } } });
    await prisma.bill.deleteMany({ where: { id: { in: billIds } } });
  }

  const busy = await prisma.bill.findMany({
    where: { status: "OPEN" },
    select: { tableId: true },
  });
  const busyIds = new Set(busy.map((b) => b.tableId).filter(Boolean));
  const table =
    (await prisma.cafeTable.findFirst({
      where: { isActive: true, id: { notIn: [...busyIds] } },
      orderBy: { sortOrder: "asc" },
    })) ??
    (await prisma.cafeTable.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }));
  if (!table) throw new Error("ماكو طاولة");

  // إن الطاولة مشغولة: أغلق فاتورتها المفتوحة أولاً (تجريبي)
  const openOnTable = await prisma.bill.findFirst({
    where: { tableId: table.id, status: "OPEN" },
    select: { id: true },
  });
  if (openOnTable) {
    const ordersOn = await prisma.order.findMany({
      where: { billId: openOnTable.id },
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
    await prisma.payment.deleteMany({ where: { billId: openOnTable.id } });
    await prisma.bill.delete({ where: { id: openOnTable.id } });
  }

  const now = new Date();
  const result = await prisma.$transaction(
    async (tx) => {
      const bill = await tx.bill.create({
        data: {
          type: "DINE_IN",
          tableId: table.id,
          status: "OPEN",
          businessDate: businessDateObj,
          shiftId: shift.id,
        },
      });

      const dailyNumber = await nextDailyNumber(tx, businessDate);

      await tx.order.create({
        data: {
          businessDate: businessDateObj,
          dailyNumber,
          billId: bill.id,
          tableId: table.id,
          type: "DINE_IN",
          status: "READY",
          note: DEMO_NOTE,
          shiftId: shift.id,
          createdById: waiter.id,
          preparingAt: now,
          readyAt: now,
          items: {
            create: offers.map((offer) => ({
              menuItemId: offer.menuItem.id,
              nameSnapshot: offer.name,
              categorySnapshot: offer.menuItem.category?.name ?? "العروض",
              priceSnapshot: offer.price,
              quantity: 1,
              note: offer.components.map((c) => c.label).join(" · ") || null,
              addedById: waiter.id,
            })),
          },
        },
      });

      const lines = await tx.orderItem.findMany({
        where: {
          status: "ACTIVE",
          order: { billId: bill.id, status: { not: "CANCELLED" } },
        },
        select: { priceSnapshot: true, quantity: true, nameSnapshot: true },
      });
      const subtotal = lines.reduce(
        (sum, i) => sum + i.priceSnapshot * i.quantity,
        0,
      );
      await tx.bill.update({
        where: { id: bill.id },
        data: { subtotal, total: subtotal, discountAmount: 0 },
      });

      return {
        billId: bill.id,
        table: table.label,
        dailyNumber,
        total: subtotal,
        items: lines.map((l) => l.nameSnapshot),
      };
    },
    { maxWait: 15_000, timeout: 30_000 },
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        message: "طلب عروض جاهز على شاشة الكاشير (حالة READY)",
        businessDate,
        ...result,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
