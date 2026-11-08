/**
 * بيانات غنية لشاشات الإدارة (لوحة، تقارير، شفتات، إلغاءات، خصومات، سجل)
 * تشغيل: node scripts/seed-owner-demo.mjs
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
  runtimeUrl ? { datasources: { db: { url: runtimeUrl } } } : undefined,
);

const TX = { timeout: 30_000, maxWait: 15_000 };

function getBusinessDate(now = new Date(), startHour = 5) {
  const shifted = new Date(now.getTime() - startHour * 3600_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(
    shifted,
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

function atDay(iso, hour, minute = 0) {
  return new Date(
    `${iso}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+03:00`,
  );
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

async function clearDemoOwnerData() {
  const demoNotes = ["demo-owner", "demo-sales", "demo-void", "demo-cancel"];
  const old = await prisma.order.findMany({
    where: { note: { in: demoNotes } },
    select: { billId: true, id: true },
  });
  if (!old.length) return;
  const billIds = [...new Set(old.map((o) => o.billId))];
  await prisma.payment.deleteMany({ where: { billId: { in: billIds } } });
  await prisma.orderItem.deleteMany({
    where: { order: { billId: { in: billIds } } },
  });
  await prisma.order.deleteMany({ where: { billId: { in: billIds } } });
  await prisma.bill.deleteMany({ where: { id: { in: billIds } } });
  await prisma.auditLog.deleteMany({
    where: { reason: { startsWith: "demo-owner" } },
  });
  // شفتات تجريبية مغلقة فقط (لا نغلق الشفت المفتوح الحالي إن وُجد)
  await prisma.shift.deleteMany({
    where: {
      note: { startsWith: "demo-owner-shift" },
      closedAt: { not: null },
    },
  });
  console.log(`نظّفنا ${billIds.length} فاتورة تجريبية قديمة`);
}

async function main() {
  await prisma.cafeSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      cafeName: "اثينا كوفي",
      phone: "0771 681 3700\n0771 755 9926",
      address: "كربلاء",
      receiptFooter: "شكراً لزيارتكم",
    },
    update: {
      cafeName: "اثينا كوفي",
      phone: "0771 681 3700\n0771 755 9926",
      address: "كربلاء",
      receiptFooter: "شكراً لزيارتكم",
    },
  });

  const settings = await prisma.cafeSettings.findUnique({ where: { id: 1 } });
  const startHour = settings?.businessDayStartHour ?? 5;
  const today = getBusinessDate(new Date(), startHour);

  const [cashier, waiter, waiter2, owner] = await Promise.all([
    prisma.profile.findUnique({ where: { username: "cashier1" } }),
    prisma.profile.findUnique({ where: { username: "waiter1" } }),
    prisma.profile.findFirst({
      where: { role: "WAITER", username: { not: "waiter1" }, isActive: true },
    }),
    prisma.profile.findFirst({ where: { role: "OWNER", isActive: true } }),
  ]);
  if (!cashier || !waiter) {
    throw new Error("شغّل npm run db:seed أولاً لإنشاء الموظفين");
  }
  const waiters = [waiter, waiter2].filter(Boolean);
  const actorOwner = owner ?? cashier;

  let tables = await prisma.cafeTable.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  if (tables.length < 30) {
    for (let i = 1; i <= 30; i++) {
      await prisma.cafeTable.upsert({
        where: { label: String(i) },
        create: { label: String(i), sortOrder: i, isActive: true },
        update: { sortOrder: i, isActive: true },
      });
    }
    tables = await prisma.cafeTable.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  const items = await prisma.menuItem.findMany({
    where: { isActive: true },
    include: { category: { select: { name: true } } },
    orderBy: { sortOrder: "asc" },
    take: 16,
  });
  if (items.length < 4) {
    throw new Error("المنيو فاضي — شغّل npm run db:seed:demo أولاً");
  }

  await clearDemoOwnerData();

  // شفت مفتوح للعمليات الحالية
  let openShift = await prisma.shift.findFirst({ where: { closedAt: null } });
  if (!openShift) {
    openShift = await prisma.shift.create({
      data: {
        openedById: cashier.id,
        openingCash: 100_000,
        openedAt: atDay(today, 8, 0),
      },
    });
  }

  // شفتات مغلقة لعرض تقرير الشفتات + فرق الصندوق (عدة أيام)
  const closedShifts = [];
  const closedShiftDays = [
    addDays(today, -1),
    addDays(today, -2),
    addDays(today, -3),
    addDays(today, -5),
  ];
  for (const [i, day] of closedShiftDays.entries()) {
    const opening = 100_000 + i * 15_000;
    const sales = 160_000 + i * 35_000;
    const expected = opening + sales;
    const counted = expected + (i % 2 === 0 ? -4_000 : 2_500);
    const shift = await prisma.shift.create({
      data: {
        openedById: cashier.id,
        openedAt: atDay(day, 8, 0),
        openingCash: opening,
        closedAt: atDay(day, 23, 30),
        closedById: cashier.id,
        countedCash: counted,
        expectedCash: expected,
        difference: counted - expected,
        note: `demo-owner-shift-${day}`,
      },
    });
    closedShifts.push({ shift, day, opening, sales });
  }

  const dayPlans = [
    {
      date: today,
      bills: [
        { picks: [0, 1], qty: [2, 1], discount: 0, hour: 9, waiter: 0 },
        { picks: [2, 3, 4], qty: [1, 2, 1], discount: 1500, hour: 11, waiter: 0, reason: "زبون دائم" },
        { picks: [5, 0], qty: [2, 1], discount: 0, hour: 13, waiter: 1 },
        { picks: [1, 6, 7], qty: [1, 1, 2], discount: 10, hour: 15, waiter: 0, percent: true, reason: "عرض اليوم" },
        { picks: [3, 8], qty: [2, 2], discount: 2000, hour: 17, waiter: 1, reason: "تعويض تأخير" },
        { picks: [4], qty: [3], discount: 0, hour: 19, waiter: 0 },
        { picks: [0, 2, 5], qty: [1, 1, 1], discount: 0, hour: 21, waiter: 1 },
        { picks: [9, 10], qty: [1, 2], discount: 500, hour: 16, waiter: 0, reason: "خصم ظهيرة" },
        { picks: [11, 12, 1], qty: [1, 1, 1], discount: 0, hour: 20, waiter: 1 },
      ],
    },
    {
      date: addDays(today, -1),
      bills: [
        { picks: [0, 2], qty: [1, 2], discount: 0, hour: 10, waiter: 0 },
        { picks: [4, 5], qty: [1, 1], discount: 500, hour: 14, waiter: 1, reason: "كوبون" },
        { picks: [1, 3, 6], qty: [2, 1, 1], discount: 0, hour: 18, waiter: 0 },
        { picks: [7, 8], qty: [2, 1], discount: 1000, hour: 20, waiter: 1, reason: "هدية إدارة" },
        { picks: [9, 0], qty: [2, 1], discount: 0, hour: 12, waiter: 0 },
      ],
      useClosedShift: 0,
    },
    {
      date: addDays(today, -2),
      bills: [
        { picks: [7, 0], qty: [1, 2], discount: 0, hour: 12, waiter: 0 },
        { picks: [2, 5], qty: [2, 2], discount: 1500, hour: 16, waiter: 1, reason: "خصم مناسبات" },
        { picks: [1, 4], qty: [1, 3], discount: 0, hour: 19, waiter: 0 },
        { picks: [10, 11], qty: [1, 1], discount: 0, hour: 21, waiter: 1 },
      ],
      useClosedShift: 1,
    },
    {
      date: addDays(today, -3),
      bills: [
        { picks: [0, 3], qty: [2, 1], discount: 0, hour: 11, waiter: 0 },
        { picks: [5, 6], qty: [1, 2], discount: 800, hour: 15, waiter: 1, reason: "تجريبي" },
        { picks: [8, 9], qty: [2, 1], discount: 0, hour: 18, waiter: 0 },
      ],
      useClosedShift: 2,
    },
    {
      date: addDays(today, -4),
      bills: [
        { picks: [1, 2], qty: [1, 1], discount: 0, hour: 10, waiter: 0 },
        { picks: [4, 7], qty: [2, 1], discount: 700, hour: 14, waiter: 1, reason: "عرض مسائي" },
        { picks: [0, 5, 8], qty: [1, 1, 2], discount: 0, hour: 19, waiter: 0 },
      ],
    },
    {
      date: addDays(today, -5),
      bills: [
        { picks: [3, 6], qty: [1, 2], discount: 0, hour: 11, waiter: 1 },
        { picks: [9, 10], qty: [1, 1], discount: 1000, hour: 17, waiter: 0, reason: "تعويض" },
        { picks: [2, 4], qty: [2, 2], discount: 0, hour: 20, waiter: 1 },
      ],
      useClosedShift: 3,
    },
    {
      date: addDays(today, -6),
      bills: [
        { picks: [0, 1, 2], qty: [1, 1, 1], discount: 0, hour: 13, waiter: 0 },
        { picks: [5, 11], qty: [2, 1], discount: 500, hour: 16, waiter: 1, reason: "كوبون" },
        { picks: [7, 8, 3], qty: [1, 2, 1], discount: 0, hour: 21, waiter: 0 },
      ],
    },
  ];

  let paidCount = 0;
  for (const day of dayPlans) {
    const businessDateObj = parseBusinessDate(day.date);
    const shiftForDay =
      day.useClosedShift != null
        ? closedShifts[day.useClosedShift]?.shift
        : openShift;

    for (let bi = 0; bi < day.bills.length; bi++) {
      const plan = day.bills[bi];
      const table = tables[bi % tables.length];
      const w = waiters[plan.waiter % waiters.length];
      await prisma.$transaction(async (tx) => {
        const lines = plan.picks.map((idx, i) => {
          const it = items[idx % items.length];
          return {
            menuItemId: it.id,
            nameSnapshot: it.name,
            categorySnapshot: it.category?.name ?? "—",
            priceSnapshot: it.price,
            quantity: plan.qty[i] ?? 1,
            addedById: w.id,
          };
        });
        const subtotal = lines.reduce(
          (s, l) => s + l.priceSnapshot * l.quantity,
          0,
        );
        let discountAmount = 0;
        let discountType = null;
        let discountValue = 0;
        if (plan.percent) {
          discountType = "PERCENT";
          discountValue = plan.discount;
          discountAmount = Math.floor((subtotal * plan.discount) / 100);
        } else if (plan.discount > 0) {
          discountType = "AMOUNT";
          discountValue = plan.discount;
          discountAmount = Math.min(plan.discount, subtotal);
        }
        const total = subtotal - discountAmount;
        const paidAt = atDay(day.date, plan.hour, 10 + bi * 5);

        const bill = await tx.bill.create({
          data: {
            type: "DINE_IN",
            tableId: table.id,
            status: "PAID",
            businessDate: businessDateObj,
            shiftId: shiftForDay.id,
            subtotal,
            discountType,
            discountValue,
            discountAmount,
            discountReason: discountAmount > 0 ? plan.reason ?? "خصم تجريبي" : null,
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
            tableId: table.id,
            type: "DINE_IN",
            status: "SERVED",
            note: "demo-owner",
            shiftId: shiftForDay.id,
            createdById: w.id,
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
            shiftId: shiftForDay.id,
            amount: total,
            receivedAmount: total + (bi % 2 === 0 ? 0 : 2000),
            createdById: cashier.id,
            createdAt: paidAt,
          },
        });

        if (discountAmount > 0) {
          await tx.auditLog.create({
            data: {
              actorId: cashier.id,
              action: "BILL_DISCOUNT",
              entityType: "Bill",
              entityId: bill.id,
              reason: `demo-owner:${plan.reason ?? "خصم"}`,
              after: { discountAmount, total },
              createdAt: paidAt,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: cashier.id,
            action: "BILL_PAID",
            entityType: "Bill",
            entityId: bill.id,
            reason: "demo-owner:دفع",
            after: { total },
            createdAt: paidAt,
          },
        });
      }, TX);
      paidCount++;
    }
  }

  // فواتير VOID لتقرير الملغاة
  for (let i = 0; i < 3; i++) {
    const day = addDays(today, -i);
    const table = tables[i % tables.length];
    const when = atDay(day, 12 + i, 20);
    await prisma.$transaction(async (tx) => {
      const it = items[i % items.length];
      const subtotal = it.price * 2;
      const bill = await tx.bill.create({
        data: {
          type: "DINE_IN",
          tableId: table.id,
          status: "VOID",
          businessDate: parseBusinessDate(day),
          shiftId: openShift.id,
          subtotal,
          total: subtotal,
          openedAt: when,
          voidedAt: when,
          voidedById: actorOwner.id,
          voidReason: ["طلب بالغلط", "زبون غيّر رأيه", "اختبار إلغاء"][i],
        },
      });
      const dailyNumber = await nextDailyNumber(tx, day);
      await tx.order.create({
        data: {
          businessDate: parseBusinessDate(day),
          dailyNumber,
          billId: bill.id,
          tableId: table.id,
          type: "DINE_IN",
          status: "CANCELLED",
          note: "demo-void",
          shiftId: openShift.id,
          createdById: waiter.id,
          cancelReason: bill.voidReason,
          cancelledAt: when,
          createdAt: when,
          items: {
            create: [
              {
                menuItemId: it.id,
                nameSnapshot: it.name,
                categorySnapshot: it.category?.name ?? "—",
                priceSnapshot: it.price,
                quantity: 2,
                status: "CANCELLED",
                cancelReason: bill.voidReason,
                cancelledAt: when,
                addedById: waiter.id,
              },
            ],
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actorOwner.id,
          action: "BILL_VOID",
          entityType: "Bill",
          entityId: bill.id,
          reason: `demo-owner:${bill.voidReason}`,
          createdAt: when,
        },
      });
    }, TX);
  }

  // إلغاءات أصناف/طلبات لتقرير الإلغاءات
  for (let i = 0; i < 4; i++) {
    const day = i < 2 ? today : addDays(today, -1);
    const table = tables[(i + 2) % tables.length];
    const when = atDay(day, 14 + i, 15);
    const w = waiters[i % waiters.length];
    await prisma.$transaction(async (tx) => {
      const itA = items[i % items.length];
      const itB = items[(i + 3) % items.length];
      const bill = await tx.bill.create({
        data: {
          type: "DINE_IN",
          tableId: table.id,
          status: "PAID",
          businessDate: parseBusinessDate(day),
          shiftId: openShift.id,
          subtotal: itB.price,
          total: itB.price,
          paidAt: when,
          paidById: cashier.id,
          openedAt: when,
        },
      });
      const dailyNumber = await nextDailyNumber(tx, day);
      const order = await tx.order.create({
        data: {
          businessDate: parseBusinessDate(day),
          dailyNumber,
          billId: bill.id,
          tableId: table.id,
          type: "DINE_IN",
          status: i % 2 === 0 ? "CANCELLED" : "SERVED",
          note: "demo-cancel",
          shiftId: openShift.id,
          createdById: w.id,
          cancelReason: i % 2 === 0 ? "الزبون ألغى الطلب" : null,
          cancelledAt: i % 2 === 0 ? when : null,
          cancelledById: i % 2 === 0 ? cashier.id : null,
          createdAt: when,
          preparingAt: when,
          readyAt: when,
          servedAt: i % 2 === 0 ? null : when,
        },
      });
      await tx.orderItem.createMany({
        data: [
          {
            orderId: order.id,
            menuItemId: itA.id,
            nameSnapshot: itA.name,
            categorySnapshot: itA.category?.name ?? "—",
            priceSnapshot: itA.price,
            quantity: 1,
            status: "CANCELLED",
            cancelReason: ["نفد الصنف", "طلب غلط", "تغيير طلب", "ما عجب الزبون"][i],
            cancelledAt: when,
            cancelledById: cashier.id,
            addedById: w.id,
          },
          {
            orderId: order.id,
            menuItemId: itB.id,
            nameSnapshot: itB.name,
            categorySnapshot: itB.category?.name ?? "—",
            priceSnapshot: itB.price,
            quantity: 1,
            status: "ACTIVE",
            addedById: w.id,
          },
        ],
      });
      await tx.payment.create({
        data: {
          billId: bill.id,
          shiftId: openShift.id,
          amount: itB.price,
          receivedAmount: itB.price,
          createdById: cashier.id,
          createdAt: when,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: cashier.id,
          action: "ORDER_ITEM_CANCELLED",
          entityType: "OrderItem",
          entityId: order.id,
          reason: "demo-owner:إلغاء صنف",
          createdAt: when,
        },
      });
    }, TX);
  }

  // طلبات مفتوحة إضافية للوحة — على طاولات بلا فاتورة مفتوحة
  const busyTableIds = new Set(
    (
      await prisma.bill.findMany({
        where: { status: "OPEN", tableId: { not: null } },
        select: { tableId: true },
      })
    ).map((b) => b.tableId),
  );
  const freeTables = tables.filter((tb) => !busyTableIds.has(tb.id)).slice(0, 3);
  for (let i = 0; i < freeTables.length; i++) {
    const table = freeTables[i];
    const when = atDay(today, 18, 5 + i);
    await prisma.$transaction(async (tx) => {
      const picks = [items[i], items[i + 1]].filter(Boolean);
      const subtotal = picks.reduce((s, it) => s + it.price, 0);
      const bill = await tx.bill.create({
        data: {
          type: "DINE_IN",
          tableId: table.id,
          status: "OPEN",
          businessDate: parseBusinessDate(today),
          shiftId: openShift.id,
          subtotal,
          total: subtotal,
          openedAt: when,
        },
      });
      const dailyNumber = await nextDailyNumber(tx, today);
      await tx.order.create({
        data: {
          businessDate: parseBusinessDate(today),
          dailyNumber,
          billId: bill.id,
          tableId: table.id,
          type: "DINE_IN",
          status: ["NEW", "PREPARING", "READY"][i],
          note: "demo-owner",
          shiftId: openShift.id,
          createdById: waiters[i % waiters.length].id,
          createdAt: when,
          preparingAt: i > 0 ? when : null,
          readyAt: i > 1 ? when : null,
          items: {
            create: picks.map((it) => ({
              menuItemId: it.id,
              nameSnapshot: it.name,
              categorySnapshot: it.category?.name ?? "—",
              priceSnapshot: it.price,
              quantity: 1,
              addedById: waiters[i % waiters.length].id,
            })),
          },
        },
      });
    }, TX);
  }

  // أعد التوفر ثم عيّن أصنافاً محددة «خلصت»
  await prisma.menuItem.updateMany({
    where: { isActive: true },
    data: { isAvailable: true },
  });
  const soldOutTargets = await prisma.menuItem.findMany({
    where: {
      isActive: true,
      name: { in: ["بان كيك لوتس", "كريب أوريو", "موهيتو كيوي"] },
    },
    select: { id: true },
  });
  const soldOutIds = soldOutTargets.map((it) => it.id);
  if (soldOutIds.length) {
    await prisma.menuItem.updateMany({
      where: { id: { in: soldOutIds } },
      data: { isAvailable: false },
    });
  }

  // طلب إلغاء معلّق للكاشير — على طاولة بلا فاتورة مفتوحة
  {
    const openNow = await prisma.bill.findMany({
      where: { status: "OPEN", tableId: { not: null } },
      select: { tableId: true },
    });
    const busy = new Set(openNow.map((b) => b.tableId));
    const free = tables.find((tb) => !busy.has(tb.id));
    if (free) {
      const when = atDay(today, 19, 45);
      const it = items[2];
      await prisma.$transaction(async (tx) => {
        const bill = await tx.bill.create({
          data: {
            type: "DINE_IN",
            tableId: free.id,
            status: "OPEN",
            businessDate: parseBusinessDate(today),
            shiftId: openShift.id,
            subtotal: it.price * 2,
            total: it.price * 2,
            openedAt: when,
          },
        });
        const dailyNumber = await nextDailyNumber(tx, today);
        await tx.order.create({
          data: {
            businessDate: parseBusinessDate(today),
            dailyNumber,
            billId: bill.id,
            tableId: free.id,
            type: "DINE_IN",
            status: "PREPARING",
            note: "demo-owner",
            cancelRequestedAt: when,
            cancelRequestedById: waiter.id,
            cancelReason: "الزبون يريد الإلغاء",
            shiftId: openShift.id,
            createdById: waiter.id,
            createdAt: when,
            preparingAt: when,
            items: {
              create: [
                {
                  menuItemId: it.id,
                  nameSnapshot: it.name,
                  categorySnapshot: it.category?.name ?? "—",
                  priceSnapshot: it.price,
                  quantity: 2,
                  addedById: waiter.id,
                },
              ],
            },
          },
        });
      }, TX);
    }
  }

  // إلغاءات إضافية لليوم فقط — لتظهر خانة الإلغاءات في لوحة اليوم
  for (let i = 0; i < 3; i++) {
    const table = tables[(i + 4) % tables.length];
    const when = atDay(today, 10 + i, 30);
    const it = items[(i + 5) % items.length];
    await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.create({
        data: {
          type: "DINE_IN",
          tableId: table.id,
          status: "PAID",
          businessDate: parseBusinessDate(today),
          shiftId: openShift.id,
          subtotal: 0,
          total: 0,
          paidAt: when,
          paidById: cashier.id,
          openedAt: when,
        },
      });
      const dailyNumber = await nextDailyNumber(tx, today);
      await tx.order.create({
        data: {
          businessDate: parseBusinessDate(today),
          dailyNumber,
          billId: bill.id,
          tableId: table.id,
          type: "DINE_IN",
          status: "CANCELLED",
          note: "demo-cancel",
          shiftId: openShift.id,
          createdById: waiter.id,
          cancelReason: "إلغاء تجريبي لليوم",
          cancelledAt: when,
          cancelledById: cashier.id,
          createdAt: when,
          items: {
            create: [
              {
                menuItemId: it.id,
                nameSnapshot: it.name,
                categorySnapshot: it.category?.name ?? "—",
                priceSnapshot: it.price,
                quantity: 1 + i,
                status: "CANCELLED",
                cancelReason: "إلغاء تجريبي لليوم",
                cancelledAt: when,
                cancelledById: cashier.id,
                addedById: waiter.id,
              },
            ],
          },
        },
      });
    }, TX);
  }

  const summary = {
    paidBills: paidCount,
    voidBills: 3,
    cancelSamples: 4,
    todayCancels: 3,
    soldOut: soldOutIds.length,
    closedShifts: closedShifts.length,
    openShift: openShift.id.slice(0, 8),
    tables: tables.length,
    items: items.length,
    staff: await prisma.profile.count({ where: { isActive: true } }),
    audit: await prisma.auditLog.count({
      where: { reason: { startsWith: "demo-owner" } },
    }),
  };
  console.log("تم ملء بيانات الإدارة:", summary);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

