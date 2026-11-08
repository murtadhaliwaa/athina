/**
 * بيانات وهمية + صور افتراضية لفحص المشروع
 * تشغيل: node scripts/seed-demo-data.mjs
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { deflateSync } from "zlib";

config({ path: ".env" });
config({ path: ".env.local", override: true });

// للتسكربتات: DIRECT_URL (5432) أوثق من pooler الضيق
const runtimeUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL;
const prisma = new PrismaClient(
  runtimeUrl ? { datasources: { db: { url: runtimeUrl } } } : undefined
);

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("مفاتيح Supabase ناقصة");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getBusinessDate(now = new Date(), startHour = 5) {
  const shifted = new Date(now.getTime() - startHour * 3600_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(
    shifted
  );
}

function parseBusinessDate(iso) {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** PNG بسيط 480×480 بلون صلب + شريط علوي */
function makePlaceholderPng(r, g, b) {
  const w = 480;
  const h = 480;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const i = row + 1 + x * 4;
      const top = y < 72;
      raw[i] = top ? Math.min(255, r + 40) : r;
      raw[i + 1] = top ? Math.min(255, g + 40) : g;
      raw[i + 2] = top ? Math.min(255, b + 40) : b;
      raw[i + 3] = 255;
    }
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcBuf) >>> 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
    return ~c;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const MENU = [
  {
    name: "قهوة",
    color: [92, 58, 38],
    photo: "coffee,espresso,cup",
    items: [
      { name: "قهوة تركية", price: 1500, description: "تقليدية ومضغوطة", photo: "turkish,coffee" },
      { name: "إسبريسو", price: 2000, description: "شوت مزدوج", photo: "espresso" },
      { name: "أمريكانو", price: 2500, photo: "americano,coffee" },
      { name: "كابتشينو", price: 3000, photo: "cappuccino" },
      { name: "لاتيه", price: 3500, photo: "latte,art" },
      { name: "موكا", price: 4000, photo: "mocha,coffee" },
      { name: "فلات وايت", price: 4000, photo: "flat,white,coffee" },
    ],
  },
  {
    name: "شاي",
    color: [140, 70, 40],
    photo: "tea,cup",
    items: [
      { name: "شاي أحمر", price: 1000, photo: "black,tea" },
      { name: "شاي أخضر", price: 1500, photo: "green,tea" },
      { name: "كركديه", price: 1500, photo: "hibiscus,tea" },
      { name: "زنجبيل", price: 2000, photo: "ginger,tea" },
      { name: "نعناع", price: 1500, photo: "mint,tea" },
    ],
  },
  {
    name: "عصائر",
    color: [210, 120, 40],
    photo: "juice,fresh",
    items: [
      { name: "برتقال طازج", price: 4000, photo: "orange,juice" },
      { name: "ليمون نعناع", price: 3500, photo: "lemonade,mint" },
      { name: "كوكتيل", price: 5000, photo: "fruit,cocktail" },
      { name: "فراولة", price: 4500, photo: "strawberry,juice" },
      { name: "مانجو", price: 4500, photo: "mango,juice" },
    ],
  },
  {
    name: "مشروبات باردة",
    color: [40, 110, 150],
    photo: "iced,coffee",
    items: [
      { name: "آيس لاتيه", price: 4000, photo: "iced,latte" },
      { name: "آيس أمريكانو", price: 3000, photo: "iced,americano" },
      { name: "ميلك شيك فانيلا", price: 5000, photo: "milkshake,vanilla" },
      { name: "ميلك شيك شوكولاتة", price: 5000, photo: "chocolate,milkshake" },
      { name: "موهيتو", price: 4500, photo: "mojito,drink" },
    ],
  },
  {
    name: "حلويات",
    color: [160, 90, 110],
    photo: "dessert,cake",
    items: [
      { name: "كيك شوكولاتة", price: 4000, photo: "chocolate,cake" },
      { name: "تشيز كيك", price: 4500, photo: "cheesecake" },
      { name: "براوني", price: 3500, photo: "brownie" },
      { name: "كوكيز", price: 2000, photo: "cookies" },
      { name: "آيس كريم", price: 3000, photo: "ice,cream" },
      { name: "دونات", price: 2500, photo: "donut" },
    ],
  },
  {
    name: "ساندويش",
    color: [180, 130, 60],
    photo: "sandwich,food",
    items: [
      { name: "كرواسان جبن", price: 3500, photo: "croissant,cheese" },
      { name: "توست دجاج", price: 4500, photo: "toast,chicken" },
      { name: "كلوب ساندويش", price: 6000, photo: "club,sandwich" },
      { name: "بيتزا شريحة", price: 4000, photo: "pizza,slice" },
    ],
  },
];

async function ensureBucket() {
  const supabase = admin();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!(buckets || []).some((b) => b.name === "menu-images")) {
    const { error } = await supabase.storage.createBucket("menu-images", {
      public: true,
      fileSizeLimit: 2_000_000,
      allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
    });
    if (error) throw error;
    console.log("أنشأنا bucket menu-images");
  } else {
    await supabase.storage.updateBucket("menu-images", {
      public: true,
      fileSizeLimit: 2_000_000,
      allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
    });
  }
}

/** روابط Unsplash مباشرة (تجريبية) — مرتبة حسب التصنيف */
const STOCK_BY_CATEGORY = {
  قهوة: [
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=640&h=480&fit=crop",
  ],
  شاي: [
    "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1571934811356-5cc061b507a7?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=640&h=480&fit=crop",
  ],
  عصائر: [
    "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1546548970-71785318a17b?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=640&h=480&fit=crop",
  ],
  "مشروبات باردة": [
    "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1579954115545-a94550b25ba8?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=640&h=480&fit=crop",
  ],
  حلويات: [
    "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=640&h=480&fit=crop",
  ],
  ساندويش: [
    "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=640&h=480&fit=crop",
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=640&h=480&fit=crop",
  ],
};

async function fetchStockUrl(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "AthenaCafeSeed/1.0" },
  });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const type = res.headers.get("content-type") || "image/jpeg";
  if (!type.startsWith("image/")) throw new Error(`not image: ${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error("image too small");
  return { buf, contentType: type.split(";")[0] };
}

async function uploadImage(itemId, rgb, catName, itemIndex) {
  const supabase = admin();
  let body = makePlaceholderPng(...rgb);
  let contentType = "image/png";
  let ext = "png";

  const pool = STOCK_BY_CATEGORY[catName] || [];
  const stockUrl = pool[itemIndex % Math.max(pool.length, 1)];
  const tryUrls = [
    stockUrl,
    `https://picsum.photos/seed/${itemId.slice(0, 8)}/640/480`,
  ].filter(Boolean);

  for (const url of tryUrls) {
    try {
      const photo = await fetchStockUrl(url);
      body = photo.buf;
      contentType = photo.contentType.includes("png") ? "image/png" : "image/jpeg";
      ext = contentType === "image/png" ? "png" : "jpg";
      break;
    } catch (e) {
      console.warn(`تعذّر ${url}:`, e.message);
    }
  }

  const path = `demo/${itemId}.${ext}`;
  await supabase.storage
    .from("menu-images")
    .remove([`demo/${itemId}.png`, `demo/${itemId}.jpg`, `demo/${itemId}.jpeg`]);

  const { error } = await supabase.storage.from("menu-images").upload(path, body, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

async function seedMenuWithImages() {
  await ensureBucket();
  let count = 0;

  for (let ci = 0; ci < MENU.length; ci++) {
    const cat = MENU[ci];
    let category = await prisma.category.findFirst({ where: { name: cat.name } });
    if (!category) {
      category = await prisma.category.create({
        data: { name: cat.name, sortOrder: ci + 1, isActive: true },
      });
    } else {
      await prisma.category.update({
        where: { id: category.id },
        data: { sortOrder: ci + 1, isActive: true },
      });
    }

    for (let ii = 0; ii < cat.items.length; ii++) {
      const item = cat.items[ii];
      let row = await prisma.menuItem.findFirst({
        where: { categoryId: category.id, name: item.name },
      });
      if (!row) {
        row = await prisma.menuItem.create({
          data: {
            categoryId: category.id,
            name: item.name,
            description: item.description ?? null,
            price: item.price,
            sortOrder: ii + 1,
            isActive: true,
            isAvailable: true,
          },
        });
      } else {
        await prisma.menuItem.update({
          where: { id: row.id },
          data: {
            description: item.description ?? row.description,
            price: item.price,
            sortOrder: ii + 1,
            isActive: true,
            isAvailable: true,
          },
        });
      }

      const shade = 12 * (ii % 4);
      const rgb = cat.color.map((c) => Math.max(0, Math.min(255, c + shade - 18)));
      const imagePath = await uploadImage(row.id, rgb, cat.name, ii);
      await prisma.menuItem.update({
        where: { id: row.id },
        data: { imagePath },
      });
      count++;
      process.stdout.write(`\rصور المنيو: ${count}`);
    }
  }
  console.log("");

  // صنف نافد للفحص
  const soldOut = await prisma.menuItem.findFirst({
    where: { name: "موكا" },
  });
  if (soldOut) {
    await prisma.menuItem.update({
      where: { id: soldOut.id },
      data: { isAvailable: false },
    });
  }

  console.log(`منيو + صور: ${count} صنفاً`);
}

async function ensureTables() {
  const count = 30;
  for (let i = 1; i <= count; i++) {
    const label = String(i);
    await prisma.cafeTable.upsert({
      where: { label },
      create: { label, sortOrder: i, isActive: true },
      update: { sortOrder: i, isActive: true },
    });
  }
  // إيقاف طاولات غير مستخدمة إن وُجدت من بيانات قديمة
  await prisma.cafeTable.updateMany({
    where: { label: { in: ["VIP", "حديقة"] } },
    data: { isActive: false },
  });
  console.log(`طاولات: ${count}`);
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

async function clearOpenBills(billIds) {
  if (!billIds.length) return;
  const orders = await prisma.order.findMany({
    where: { billId: { in: billIds } },
    select: { id: true },
  });
  if (orders.length) {
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: orders.map((o) => o.id) } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: orders.map((o) => o.id) } },
    });
  }
  await prisma.payment.deleteMany({ where: { billId: { in: billIds } } });
  await prisma.bill.deleteMany({ where: { id: { in: billIds } } });
}

async function clearDemoOrders() {
  const oldDemo = await prisma.order.findMany({
    where: { note: "demo-seed" },
    select: { id: true, billId: true },
  });
  if (oldDemo.length) {
    await clearOpenBills([...new Set(oldDemo.map((o) => o.billId))]);
    console.log(`حذفنا ${oldDemo.length} طلب demo-seed قديم`);
  }

  // فهرس partial: طاولة واحدة = فاتورة OPEN واحدة — نحرّر كل المفتوحة للتجربة
  const leftover = await prisma.bill.findMany({
    where: { status: "OPEN" },
    select: { id: true },
  });
  if (leftover.length) {
    await clearOpenBills(leftover.map((b) => b.id));
    console.log(`حرّرنا ${leftover.length} فاتورة مفتوحة`);
  }
}

async function seedSampleOrders() {
  const settings = await prisma.cafeSettings.findUnique({ where: { id: 1 } });
  const businessDate = getBusinessDate(
    new Date(),
    settings?.businessDayStartHour ?? 5
  );
  const businessDateObj = parseBusinessDate(businessDate);

  const cashier = await prisma.profile.findUnique({
    where: { username: "cashier1" },
  });
  const waiter = await prisma.profile.findUnique({
    where: { username: "waiter1" },
  });
  const waiter2 = await prisma.profile.findUnique({
    where: { username: "waiter2" },
  });
  if (!cashier || !waiter) {
    console.warn("تخطينا الطلبات: الموظفون غير موجودين — شغّل npm run db:seed أولاً");
    return;
  }

  let shift = await prisma.shift.findFirst({ where: { closedAt: null } });
  if (!shift) {
    shift = await prisma.shift.create({
      data: { openedById: cashier.id, openingCash: 150_000 },
    });
    console.log("فتحنا شفت تجريبي");
  }

  await clearDemoOrders();

  const tables = await prisma.cafeTable.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 8,
  });
  const items = await prisma.menuItem.findMany({
    where: { isActive: true, isAvailable: true },
    include: { category: { select: { name: true } } },
    take: 20,
    orderBy: { sortOrder: "asc" },
  });
  if (items.length < 4 || tables.length < 4) {
    console.warn("منيو/طاولات غير كافية للطلبات التجريبية");
    return;
  }

  const minsAgo = (m) => new Date(Date.now() - m * 60_000);

  const scenarios = [
    { status: "NEW", table: tables[0], pick: [0, 1], openedMins: 42, by: waiter },
    { status: "PREPARING", table: tables[1], pick: [2, 3, 4], openedMins: 28, by: waiter },
    { status: "READY", table: tables[2], pick: [5, 6], openedMins: 18, by: waiter },
    { status: "NEW", table: tables[3], pick: [1, 7, 8], openedMins: 8, by: waiter2 || waiter },
    { status: "READY", table: tables[4], pick: [0, 2, 9], openedMins: 35, by: waiter },
    { status: "PREPARING", table: tables[5], pick: [3, 10], openedMins: 15, by: waiter2 || waiter },
  ];

  for (const s of scenarios) {
    await prisma.$transaction(
      async (tx) => {
        const openedAt = minsAgo(s.openedMins ?? 10);
        const bill = await tx.bill.create({
          data: {
            type: "DINE_IN",
            tableId: s.table.id,
            status: "OPEN",
            businessDate: businessDateObj,
            shiftId: shift.id,
            openedAt,
          },
        });

        const dailyNumber = await nextDailyNumber(tx, businessDate);
        const lines = s.pick.map((idx) => items[idx % items.length]);
        const creator = s.by;

        const order = await tx.order.create({
          data: {
            businessDate: businessDateObj,
            dailyNumber,
            billId: bill.id,
            tableId: s.table.id,
            type: "DINE_IN",
            status: s.status,
            note: "demo-seed",
            isFollowUp: false,
            shiftId: shift.id,
            createdById: creator.id,
            createdAt: openedAt,
            preparingAt: ["PREPARING", "READY", "SERVED"].includes(s.status)
              ? minsAgo(Math.max(1, (s.openedMins ?? 10) - 5))
              : null,
            readyAt: ["READY", "SERVED"].includes(s.status)
              ? minsAgo(Math.max(1, (s.openedMins ?? 10) - 2))
              : null,
            servedAt: s.status === "SERVED" ? openedAt : null,
            items: {
              create: lines.map((it, i) => ({
                menuItemId: it.id,
                nameSnapshot: it.name,
                categorySnapshot: it.category?.name ?? "—",
                priceSnapshot: it.price,
                quantity: 1 + (i % 2),
                note: it.name.includes("شاي") ? "سكر زيادة" : null,
                addedById: creator.id,
              })),
            },
          },
          include: { items: true },
        });

        const subtotal = order.items.reduce(
          (sum, i) => sum + i.priceSnapshot * i.quantity,
          0
        );
        await tx.bill.update({
          where: { id: bill.id },
          data: { subtotal, total: subtotal, discountAmount: 0 },
        });
      },
      { timeout: 20_000 }
    );
  }

  console.log(
    `طلبات مفتوحة تجريبية: ${scenarios.length} (جديد / يتحضّر / جاهز)`
  );
}

async function main() {
  const imagesOnly = process.argv.includes("--images-only");
  const ordersOnly = process.argv.includes("--orders-only");
  const skipImages = process.argv.includes("--skip-images") || ordersOnly;

  if (imagesOnly) {
    await seedMenuWithImages();
    console.log("تم تحديث صور المنيو فقط");
    return;
  }

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

  await ensureTables();

  if (!skipImages) {
    const withImages = await prisma.menuItem.count({
      where: { imagePath: { not: null }, isActive: true },
    });
    if (withImages >= 20) {
      console.log(`صور المنيو موجودة (${withImages}) — تخطينا الرفع`);
    } else {
      await seedMenuWithImages();
    }
  } else {
    // تأكد من وجود أصناف أساسية بدون صور إن لزم
    const itemCount = await prisma.menuItem.count({ where: { isActive: true } });
    if (itemCount < 8) {
      await seedMenuWithImages();
    } else {
      console.log("تخطي رفع الصور (--skip-images)");
    }
  }

  await seedSampleOrders();

  const summary = {
    categories: await prisma.category.count(),
    items: await prisma.menuItem.count(),
    withImages: await prisma.menuItem.count({ where: { imagePath: { not: null } } }),
    tables: await prisma.cafeTable.count({ where: { isActive: true } }),
    openOrders: await prisma.order.count({
      where: { status: { in: ["NEW", "PREPARING", "READY"] } },
    }),
    openBills: await prisma.bill.count({ where: { status: "OPEN" } }),
  };
  console.log("الخلاصة:", summary);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
