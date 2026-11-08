import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { PrismaClient, Role } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

const prisma = new PrismaClient();

function derivePassword(username: string, pin: string) {
  const pepper = process.env.PIN_PEPPER;
  if (!pepper) throw new Error("PIN_PEPPER ناقص");
  return createHmac("sha256", pepper).update(`${username}:${pin}`).digest("hex");
}

function staffEmail(username: string) {
  return `${username}@staff.cafe.local`;
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("مفاتيح Supabase ناقصة");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function upsertStaff(opts: {
  username: string;
  fullName: string;
  role: Role;
  pin: string;
}) {
  const supabase = admin();
  const email = staffEmail(opts.username);
  const password = derivePassword(opts.username, opts.pin);

  const existing = await prisma.profile.findUnique({
    where: { username: opts.username },
  });

  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password,
      app_metadata: { role: opts.role },
      ban_duration: "none",
    });
    await prisma.profile.update({
      where: { id: existing.id },
      data: {
        fullName: opts.fullName,
        role: opts.role,
        isActive: true,
      },
    });
    console.log(`حدّثنا الموظف: ${opts.username}`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: opts.role },
  });

  if (error || !data.user) {
    throw new Error(`فشل إنشاء ${opts.username}: ${error?.message}`);
  }

  await prisma.profile.create({
    data: {
      id: data.user.id,
      username: opts.username,
      fullName: opts.fullName,
      role: opts.role,
    },
  });

  console.log(`أنشأنا الموظف: ${opts.username} / PIN ${opts.pin}`);
  return data.user.id;
}

async function ensureOwner() {
  const ownerId = process.env.OWNER_USER_ID;
  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerName = process.env.OWNER_FULL_NAME || "المالك";

  if (ownerId) {
    await prisma.profile.upsert({
      where: { id: ownerId },
      create: {
        id: ownerId,
        username: "owner",
        fullName: ownerName,
        role: "OWNER",
      },
      update: {
        fullName: ownerName,
        role: "OWNER",
        isActive: true,
      },
    });

    await admin().auth.admin.updateUserById(ownerId, {
      app_metadata: { role: "OWNER" },
    });
    console.log(`ربطنا المالك بالمعرّف: ${ownerId}`);
    return;
  }

  if (ownerEmail) {
    const supabase = admin();
    const list = await supabase.auth.admin.listUsers({ perPage: 200 });
    const user = list.data.users.find(
      (u) => u.email?.toLowerCase() === ownerEmail.toLowerCase()
    );
    if (!user) {
      console.warn(
        `ما لقينا مستخدم بالمالك ${ownerEmail}. أنشئه من لوحة Supabase ثم أعد الـ seed مع OWNER_USER_ID أو OWNER_EMAIL.`
      );
      return;
    }
    await prisma.profile.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        username: "owner",
        fullName: ownerName,
        role: "OWNER",
      },
      update: {
        fullName: ownerName,
        role: "OWNER",
        isActive: true,
      },
    });
    await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: { role: "OWNER" },
    });
    console.log(`ربطنا المالك: ${ownerEmail}`);
  } else {
    console.warn(
      "تخطي المالك: ضع OWNER_USER_ID أو OWNER_EMAIL في .env.local"
    );
  }
}

async function main() {
  await prisma.cafeSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      cafeName: "اثينا كوفي",
      phone: "0771 681 3700 · 0771 755 9926",
      receiptFooter: "شكراً لزيارتكم",
    },
    update: {
      cafeName: "اثينا كوفي",
      phone: "0771 681 3700 · 0771 755 9926",
      address: null,
      receiptFooter: "شكراً لزيارتكم",
    },
  });
  console.log("إعدادات الكوفي جاهزة");

  await ensureOwner();

  if (process.env.NODE_ENV !== "production" && process.env.SEED_DEMO !== "0") {
    await upsertStaff({
      username: "cashier1",
      fullName: "كاشير تجريبي",
      role: "CASHIER",
      pin: "111111",
    });
    await upsertStaff({
      username: "waiter1",
      fullName: "كابتن واحد",
      role: "WAITER",
      pin: "222222",
    });
    await upsertStaff({
      username: "waiter2",
      fullName: "كابتن اثنين",
      role: "WAITER",
      pin: "333333",
    });

    for (let i = 1; i <= 30; i++) {
      const label = String(i);
      await prisma.cafeTable.upsert({
        where: { label },
        create: { label, sortOrder: i },
        update: { isActive: true, sortOrder: i },
      });
    }
    console.log("طاولات تجريبية جاهزة");

    // منيو أثينا كوفي الرسمي (نفس scripts/athena-menu-data.mjs)
    const menuSeed: Array<{
      name: string;
      items: Array<{ name: string; price: number; description?: string }>;
    }> = [
      {
        name: "أركيله بابلي",
        items: [
          { name: "تفاحتين نخلة", price: 6000 },
          { name: "عنب نعناع", price: 5000 },
          { name: "تفاحتين", price: 5000 },
          { name: "أثينا 2", price: 6000 },
          { name: "أثينا", price: 6000 },
          { name: "انكليزي", price: 5000 },
          { name: "علج فراولة", price: 5000 },
          { name: "حمضيات", price: 5000 },
          { name: "علج نعناع", price: 5000 },
          { name: "ليمون نعناع", price: 5000 },
        ],
      },
      {
        name: "أركيله خشب",
        items: [
          { name: "تفاحتين نخلة", price: 5000 },
          { name: "عنب نعناع", price: 4000 },
          { name: "تفاحتين", price: 4000 },
          { name: "أثينا 2", price: 5000 },
          { name: "أثينا", price: 5000 },
          { name: "انكليزي", price: 4000 },
          { name: "علج فراولة", price: 4000 },
          { name: "حمضيات", price: 4000 },
          { name: "علج نعناع", price: 4000 },
          { name: "ليمون نعناع", price: 4000 },
        ],
      },
      {
        name: "القهوة",
        items: [
          { name: "قهوة تركية سادة", price: 1500 },
          { name: "قهوة تركية وسط", price: 1500 },
          { name: "قهوة تركية حلوة", price: 1500 },
          { name: "قهوة عثمانية", price: 1500 },
          { name: "قهوة جكليتية", price: 1000 },
          { name: "كابتشينو", price: 1000 },
          { name: "حليب كاكاو", price: 1000 },
        ],
      },
      {
        name: "الشاي",
        items: [
          { name: "شاي عراقي", price: 500 },
          { name: "شاي ليمون", price: 1000 },
          { name: "شاي كرك", price: 1500 },
        ],
      },
      {
        name: "العصائر الطبيعية",
        items: [
          { name: "عصير برتقال", price: 2000 },
          { name: "عصير بطيخ", price: 2000 },
          { name: "عصير رمان", price: 2000 },
          { name: "عصير ليمون", price: 2000 },
          { name: "عصير كوكتيل", price: 3000 },
          { name: "عصير موز", price: 2000 },
          { name: "عصير برتقال ليمون", price: 2000 },
        ],
      },
      {
        name: "الموهيتو",
        items: [
          { name: "موهيتو بلو كوراساو", price: 3000 },
          { name: "موهيتو ليمون نعناع", price: 3000 },
          { name: "موهيتو فراولة", price: 3000 },
          { name: "موهيتو أناناس", price: 3000 },
          { name: "موهيتو كيوي", price: 3000 },
        ],
      },
      {
        name: "المشروبات الغازية",
        items: [
          { name: "بيبسي", price: 750 },
          { name: "سفن", price: 750 },
          { name: "ميرندا", price: 750 },
          { name: "تايغر", price: 1500 },
          { name: "بربيكان", price: 1500 },
        ],
      },
      {
        name: "المياه",
        items: [
          { name: "ماء", price: 500 },
        ],
      },
      {
        name: "الكريب",
        items: [
          { name: "كريب فواكه", price: 3500 },
          { name: "كريب نوتيلا", price: 3500 },
          { name: "كريب بستاشيو", price: 4500 },
          { name: "كريب كيندر", price: 4500 },
          { name: "كريب أوريو", price: 4500 },
          { name: "كريب لوتس", price: 4500 },
        ],
      },
      {
        name: "بان كيك",
        items: [
          { name: "بان كيك فواكه", price: 3500 },
          { name: "بان كيك نوتيلا", price: 3500 },
          { name: "بان كيك بستاشيو", price: 4500 },
          { name: "بان كيك كيندر", price: 4500 },
          { name: "بان كيك أوريو", price: 4500 },
          { name: "بان كيك لوتس", price: 4500 },
        ],
      },
    ];

    for (let ci = 0; ci < menuSeed.length; ci++) {
      const cat = menuSeed[ci];
      let category = await prisma.category.findFirst({
        where: { name: cat.name },
      });
      if (!category) {
        category = await prisma.category.create({
          data: { name: cat.name, sortOrder: ci + 1 },
        });
      }
      for (let ii = 0; ii < cat.items.length; ii++) {
        const item = cat.items[ii];
        const existing = await prisma.menuItem.findFirst({
          where: { categoryId: category.id, name: item.name },
        });
        if (!existing) {
          await prisma.menuItem.create({
            data: {
              categoryId: category.id,
              name: item.name,
              description: item.description,
              price: item.price,
              sortOrder: ii + 1,
            },
          });
        }
      }
    }
    console.log("منيو تجريبي جاهز");

    const cashier = await prisma.profile.findUnique({
      where: { username: "cashier1" },
    });
    if (cashier) {
      const open = await prisma.shift.findFirst({ where: { closedAt: null } });
      if (!open) {
        await prisma.shift.create({
          data: { openedById: cashier.id, openingCash: 100_000 },
        });
        console.log("شفت تجريبي مفتوح");
      }
    }
  }
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
