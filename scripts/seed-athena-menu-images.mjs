/**
 * صور مناسبة لأصناف منيو أثينا — رفع إلى menu-images
 * تشغيل: npm run db:seed:menu-images
 */
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const __dirname = dirname(fileURLToPath(import.meta.url));

/** صور محلية مخصّصة (تصنيف|صنف) — تتقدّم على Unsplash */
const LOCAL_ITEM_IMAGES = {
  "أركيله بابلي|ليمون نعناع": resolve(
    __dirname,
    "../assets/menu/arkila-babli-lemon-mint.jpg",
  ),
  "أركيله بابلي|عنب نعناع": resolve(
    __dirname,
    "../assets/menu/arkila-babli-grape-mint.jpg",
  ),
  "أركيله بابلي|تفاحتين": resolve(
    __dirname,
    "../assets/menu/arkila-babli-double-apple.jpg",
  ),
  "أركيله بابلي|حمضيات": resolve(
    __dirname,
    "../assets/menu/arkila-babli-citrus.jpg",
  ),
  "أركيله بابلي|انكليزي": resolve(
    __dirname,
    "../assets/menu/arkila-babli-english.jpg",
  ),
  "أركيله بابلي|أثينا": resolve(
    __dirname,
    "../assets/menu/arkila-babli-athena.jpg",
  ),
  "أركيله بابلي|أثينا 2": resolve(
    __dirname,
    "../assets/menu/arkila-babli-athena-2.jpg",
  ),
  "أركيله بابلي|تفاحتين نخلة": resolve(
    __dirname,
    "../assets/menu/hookah-babylon-two-apples-nakhla.jpg",
  ),
  "أركيله بابلي|علج فراولة": resolve(
    __dirname,
    "../assets/menu/arkila-babli-strawberry.jpg",
  ),
  "أركيله بابلي|علج نعناع": resolve(
    __dirname,
    "../assets/menu/hookah-babylon-gum-mint.jpg",
  ),
  "أركيله خشب|علج نعناع": resolve(
    __dirname,
    "../assets/menu/hookah-wood-gum-mint.jpg",
  ),
  "أركيله خشب|ليمون نعناع": resolve(
    __dirname,
    "../assets/menu/arkila-khashab-lemon-mint.jpg",
  ),
  "أركيله خشب|عنب نعناع": resolve(
    __dirname,
    "../assets/menu/arkila-khashab-grape-mint.jpg",
  ),
  "أركيله خشب|تفاحتين": resolve(
    __dirname,
    "../assets/menu/arkila-khashab-double-apple.jpg",
  ),
  "أركيله خشب|حمضيات": resolve(
    __dirname,
    "../assets/menu/arkila-khashab-citrus.jpg",
  ),
  "أركيله خشب|انكليزي": resolve(
    __dirname,
    "../assets/menu/arkila-khashab-english.jpg",
  ),
  "أركيله خشب|تفاحتين نخلة": resolve(
    __dirname,
    "../assets/menu/hookah-wood-two-apples-nakhla.jpg",
  ),
  "أركيله خشب|علج فراولة": resolve(
    __dirname,
    "../assets/menu/arkila-khashab-strawberry.jpg",
  ),
  "أركيله خشب|أثينا": resolve(
    __dirname,
    "../assets/menu/arkila-khashab-athena.jpg",
  ),
  "أركيله خشب|أثينا 2": resolve(
    __dirname,
    "../assets/menu/arkila-khashab-athena-2.jpg",
  ),
  "القهوة|قهوة تركية سادة": resolve(
    __dirname,
    "../assets/menu/coffee-turkish-plain.jpg",
  ),
  "القهوة|قهوة تركية وسط": resolve(
    __dirname,
    "../assets/menu/coffee-turkish-medium.jpg",
  ),
  "القهوة|قهوة تركية حلوة": resolve(
    __dirname,
    "../assets/menu/coffee-turkish-sweet.jpg",
  ),
  "القهوة|قهوة عثمانية": resolve(
    __dirname,
    "../assets/menu/coffee-ottoman.jpg",
  ),
  "القهوة|قهوة جكليتية": resolve(
    __dirname,
    "../assets/menu/coffee-chocolaty.jpg",
  ),
  "القهوة|كابتشينو": resolve(
    __dirname,
    "../assets/menu/coffee-cappuccino.jpg",
  ),
  "القهوة|حليب كاكاو": resolve(
    __dirname,
    "../assets/menu/coffee-cocoa-milk.jpg",
  ),
  "الشاي|شاي عراقي": resolve(__dirname, "../assets/menu/tea-iraqi.jpg"),
  "الشاي|شاي ليمون": resolve(__dirname, "../assets/menu/tea-lemon.jpg"),
  "الشاي|شاي كرك": resolve(__dirname, "../assets/menu/tea-karak.jpg"),
  "العصائر الطبيعية|عصير برتقال": resolve(
    __dirname,
    "../assets/menu/juice-orange.jpg",
  ),
  "العصائر الطبيعية|عصير ليمون": resolve(
    __dirname,
    "../assets/menu/juice-lemon.jpg",
  ),
  "العصائر الطبيعية|عصير رمان": resolve(
    __dirname,
    "../assets/menu/juice-pomegranate.jpg",
  ),
  "العصائر الطبيعية|عصير بطيخ": resolve(
    __dirname,
    "../assets/menu/juice-melon.jpg",
  ),
  "العصائر الطبيعية|عصير كوكتيل": resolve(
    __dirname,
    "../assets/menu/juice-cocktail.jpg",
  ),
  "العصائر الطبيعية|عصير موز": resolve(
    __dirname,
    "../assets/menu/juice-banana.jpg",
  ),
  "العصائر الطبيعية|عصير برتقال ليمون": resolve(
    __dirname,
    "../assets/menu/juice-orange-lemon.jpg",
  ),
  "الموهيتو|موهيتو بلو كوراساو": resolve(
    __dirname,
    "../assets/menu/mojito-blue-curacao.jpg",
  ),
  "الموهيتو|موهيتو ليمون نعناع": resolve(
    __dirname,
    "../assets/menu/mojito-lemon-mint.jpg",
  ),
  "الموهيتو|موهيتو فراولة": resolve(
    __dirname,
    "../assets/menu/mojito-strawberry.jpg",
  ),
  "الموهيتو|موهيتو أناناس": resolve(
    __dirname,
    "../assets/menu/mojito-pineapple.jpg",
  ),
  "الموهيتو|موهيتو كيوي": resolve(
    __dirname,
    "../assets/menu/mojito-kiwi.jpg",
  ),
  "المشروبات الغازية|بيبسي": resolve(
    __dirname,
    "../assets/menu/soda-pepsi.jpg",
  ),
  "المشروبات الغازية|سفن": resolve(
    __dirname,
    "../assets/menu/soda-7up.jpg",
  ),
  "المشروبات الغازية|ميرندا": resolve(
    __dirname,
    "../assets/menu/soda-mirinda.jpg",
  ),
  "المشروبات الغازية|تايغر": resolve(
    __dirname,
    "../assets/menu/energy-tiger.jpg",
  ),
  "المشروبات الغازية|بربيكان": resolve(
    __dirname,
    "../assets/menu/soda-barbican.jpg",
  ),
  "المياه|ماء": resolve(__dirname, "../assets/menu/water.jpg"),
  "الكريب|كريب فواكه": resolve(__dirname, "../assets/menu/crepe-fruits.jpg"),
  "الكريب|كريب نوتيلا": resolve(__dirname, "../assets/menu/crepe-nutella.jpg"),
  "الكريب|كريب بستاشيو": resolve(
    __dirname,
    "../assets/menu/crepe-pistachio.jpg",
  ),
  "الكريب|كريب أوريو": resolve(__dirname, "../assets/menu/crepe-oreo.jpg"),
  "الكريب|كريب كيندر": resolve(__dirname, "../assets/menu/crepe-kinder.jpg"),
  "الكريب|كريب لوتس": resolve(__dirname, "../assets/menu/crepe-lotus.jpg"),
  "بان كيك|بان كيك نوتيلا": resolve(
    __dirname,
    "../assets/menu/pancake-nutella.jpg",
  ),
  "بان كيك|بان كيك بستاشيو": resolve(
    __dirname,
    "../assets/menu/pancake-pistachio.jpg",
  ),
  "بان كيك|بان كيك كيندر": resolve(
    __dirname,
    "../assets/menu/pancake-kinder.jpg",
  ),
  "بان كيك|بان كيك فواكه": resolve(
    __dirname,
    "../assets/menu/pancake-fruits.jpg",
  ),
  "بان كيك|بان كيك أوريو": resolve(
    __dirname,
    "../assets/menu/pancake-oreo.jpg",
  ),
  "بان كيك|بان كيك لوتس": resolve(
    __dirname,
    "../assets/menu/pancake-lotus.jpg",
  ),
};

const runtimeUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL;
const prisma = new PrismaClient(
  runtimeUrl ? { datasources: { db: { url: runtimeUrl } } } : undefined,
);

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("مفاتيح Supabase ناقصة");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const u = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=480&h=480&q=70`;

/** روابط Unsplash مجرّبة — مطابقة تقريبية لكل صنف */
const ITEM_URL = {
  // أركيلة (نكهة → فاكهة / أركيلة)
  "ليمون نعناع": u("photo-1582979512210-99b6a53386f9"),
  "عنب نعناع": u("photo-1537640538966-79bd3873b6c7"),
  تفاحتين: u("photo-1560806887-1e4cd0b6cbd6"),
  حمضيات: u("photo-1611080626919-7cf5a9dbab5b"),
  أثينا: u("photo-1572490122747-3968b75cc699"),
  "أثينا 2": u("photo-1544787219-7f47ccb76574"),
  انكليزي: u("photo-1527118736611-4c6c2e0b6e4a"),
  "علج فراولة": u("photo-1464965911861-746a04b4bca6"),
  // قهوة
  "قهوة تركية سادة": u("photo-1514432324607-a09d9b4aefdd"),
  "قهوة تركية وسط": u("photo-1510590337019-5ef8d3d32116"),
  "قهوة تركية حلوة": u("photo-1495474472287-4d71bcdd2085"),
  "قهوة عثمانية": u("photo-1447933601403-0c6688de566e"),
  "قهوة جكليتية": u("photo-1509042239860-f550ce710b93"),
  كابتشينو: u("photo-1572442388796-11668a67e53d"),
  "حليب كاكاو": u("photo-1542990253-0d0f5ab86f2a"),
  // شاي
  "شاي عراقي": u("photo-1576092768241-dec231879fc3"),
  "شاي ليمون": u("photo-1556679343-c7306c1976bc"),
  "شاي كرك": u("photo-1564890369478-c89ca6d9cde9"),
  // عصائر
  "عصير برتقال": u("photo-1622597467836-f3285f2131b8"),
  "عصير ليمون": u("photo-1523677011789-c9180bd07a4a"),
  "عصير برتقال ليمون": u("photo-1621506289937-a8e4df240d0b"),
  "عصير أناناس": u("photo-1550258987-190a2d41a8ba"),
  // موهيتو
  "موهيتو بلو كوراساو": u("photo-1551538827-9c037cb4f32a"),
  "موهيتو ليمون نعناع": u("photo-1514362545857-3bc16c4c7d1a"),
  "موهيتو فراولة": u("photo-1546173159-315724a31696"),
  "موهيتو أناناس": u("photo-1572490122747-3968b75cc699"),
  "موهيتو كيوي": u("photo-1556679343-c7306c1976bc"),
  // غازية
  بيبسي: u("photo-1629203851122-3726ecdf080e"),
  سفن: u("photo-1625772299848-391acc1e9d6c"),
  ميرندا: u("photo-1622483767028-3f66f32aef97"),
  تايغر: u("photo-1554866585-cd94860890b7"),
  بربيكان: u("photo-1608270586620-248524c67de9"),
  // مياه
  ماء: u("photo-1523362625305-c14d5a34d3e2"),
  "ماء معدني": u("photo-1548832633-bf924d5e2e4e"),
  // كريب
  "كريب فواكه": u("photo-1519676867240-f03562e64548"),
  "كريب نوتيلا": u("photo-1519677100203-a0e668c92439"),
  "كريب بستاشيو": u("photo-1563805042-7684c019e1cb"),
  "كريب كيندر": u("photo-1488477181946-6428a0291777"),
  "كريب أوريو": u("photo-1606313564200-e75d5e30476c"),
  "كريب لوتس": u("photo-1551024601-bec78aea704b"),
  // بان كيك
  "بان كيك نوتيلا": u("photo-1567620905732-2d1ec7ab7445"),
  "بان كيك بستاشيو": u("photo-1528207776546-365bb710ee93"),
  "بان كيك كيندر": u("photo-1506084868230-bb9d95c24759"),
  "بان كيك فواكه": u("photo-1565299543923-37dd3788742d"),
  "بان كيك أوريو": u("photo-1516684669134-de6f7c473a2a"),
  "بان كيك لوتس": u("photo-1484723091739-30a097e8f929"),
};

const CAT_FALLBACK = {
  "أركيله بابلي": u("photo-1572490122747-3968b75cc699"),
  "أركيله خشب": u("photo-1544787219-7f47ccb76574"),
  القهوة: u("photo-1495474472287-4d71bcdd2085"),
  الشاي: u("photo-1576092768241-dec231879fc3"),
  "العصائر الطبيعية": u("photo-1622597467836-f3285f2131b8"),
  الموهيتو: u("photo-1551538827-9c037cb4f32a"),
  "المشروبات الغازية": u("photo-1629203851122-3726ecdf080e"),
  المياه: u("photo-1548832633-bf924d5e2e4e"),
  الكريب: u("photo-1519676867240-f03562e64548"),
  "بان كيك": u("photo-1567620905732-2d1ec7ab7445"),
};

async function ensureBucket(supabase) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === "menu-images")) {
    const { error } = await supabase.storage.createBucket("menu-images", {
      public: true,
      fileSizeLimit: 2_000_000,
      allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
    });
    if (error) throw error;
    console.log("أنشأنا bucket menu-images");
  }
}

async function fetchImage(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "AthenaCafeMenuImages/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
  if (!type.startsWith("image/")) throw new Error(`not image: ${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1500) throw new Error("too small");
  return {
    buf,
    contentType: type.includes("png") ? "image/png" : "image/jpeg",
  };
}

function urlsFor(itemName, catName) {
  const list = [];
  if (ITEM_URL[itemName]) list.push(ITEM_URL[itemName]);
  if (CAT_FALLBACK[catName]) list.push(CAT_FALLBACK[catName]);
  list.push(
    `https://picsum.photos/seed/${encodeURIComponent(catName + "-" + itemName)}/480/480`,
  );
  return [...new Set(list)];
}

async function loadLocalImage(catName, itemName) {
  const localPath = LOCAL_ITEM_IMAGES[`${catName}|${itemName}`];
  if (!localPath || !existsSync(localPath)) return null;
  const raw = readFileSync(localPath);
  const webp = await sharp(raw)
    .rotate()
    .resize(800, 800, { fit: "cover", position: "centre" })
    .webp({ quality: 78 })
    .toBuffer();
  return { buf: webp, contentType: "image/webp" };
}

async function uploadForItem(supabase, item, catName) {
  let body = null;
  let contentType = "image/jpeg";

  const local = await loadLocalImage(catName, item.name);
  if (local) {
    body = local.buf;
    contentType = local.contentType;
  } else {
    for (const url of urlsFor(item.name, catName)) {
      try {
        const photo = await fetchImage(url);
        body = photo.buf;
        contentType = photo.contentType;
        break;
      } catch {
        /* التالي */
      }
    }
  }
  if (!body) throw new Error("no image");

  const ext =
    contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : "jpg";
  const path = `athena/${item.id}-${Date.now()}.${ext}`;
  await supabase.storage
    .from("menu-images")
    .remove(
      [
        `athena/${item.id}.png`,
        `athena/${item.id}.jpg`,
        `athena/${item.id}.jpeg`,
        `athena/${item.id}.webp`,
        `demo/${item.id}.png`,
        `demo/${item.id}.jpg`,
        item.imagePath,
      ].filter(Boolean),
    );

  const { error } = await supabase.storage
    .from("menu-images")
    .upload(path, body, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

const supabase = admin();
await ensureBucket(supabase);

const items = await prisma.menuItem.findMany({
  where: { isActive: true, category: { isActive: true } },
  orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  select: {
    id: true,
    name: true,
    imagePath: true,
    category: { select: { name: true } },
  },
});

let ok = 0;
let fail = 0;
for (const item of items) {
  const catName = item.category.name;
  try {
    const imagePath = await uploadForItem(supabase, item, catName);
    await prisma.menuItem.update({
      where: { id: item.id },
      data: { imagePath },
    });
    ok += 1;
    process.stdout.write(`\rصور: ${ok}/${items.length}`);
  } catch (e) {
    fail += 1;
    console.warn(`\nفشل ${catName}/${item.name}:`, e.message);
  }
}

console.log(`\nتم: ${ok} · فشل: ${fail}`);
await prisma.$disconnect();
