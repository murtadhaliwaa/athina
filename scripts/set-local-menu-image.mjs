/**
 * رفع صورة محلية لصنف منيو: node scripts/set-local-menu-image.mjs "أركيله بابلي" "عنب نعناع" assets/menu/file.jpg
 */
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const [categoryName, itemName, relativePath] = process.argv.slice(2);
if (!categoryName || !itemName || !relativePath) {
  console.error(
    'الاستخدام: node scripts/set-local-menu-image.mjs "التصنيف" "الصنف" مسار/الصورة.jpg',
  );
  process.exit(1);
}

const imageFile = resolve(process.cwd(), relativePath);
if (!existsSync(imageFile)) {
  console.error("الملف غير موجود:", imageFile);
  process.exit(1);
}

// تفضيل منفذ الـ pooler (6543) — DIRECT_URL أحياناً يشير لـ :5432 ويتعذّر الوصول
const runtimeUrl =
  process.env.DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DIRECT_URL;
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

const item = await prisma.menuItem.findFirst({
  where: {
    name: itemName,
    isActive: true,
    category: { name: categoryName, isActive: true },
  },
  select: {
    id: true,
    name: true,
    imagePath: true,
    category: { select: { name: true } },
  },
});

if (!item) {
  console.error(`لم نجد: ${categoryName} / ${itemName}`);
  await prisma.$disconnect();
  process.exit(1);
}

const webp = await sharp(readFileSync(imageFile))
  .rotate()
  .resize(800, 800, { fit: "cover", position: "centre" })
  .webp({ quality: 78 })
  .toBuffer();

const stamp = Date.now();
const storagePath = `athena/${item.id}-${stamp}.webp`;
const supabase = admin();

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
  .upload(storagePath, webp, { contentType: "image/webp", upsert: true });

if (error) {
  console.error("رفع فشل:", error.message);
  await prisma.$disconnect();
  process.exit(1);
}

await prisma.menuItem.update({
  where: { id: item.id },
  data: { imagePath: storagePath },
});

console.log(`تم: ${item.category.name} / ${item.name}`);
console.log(`path: ${storagePath} (${webp.length} bytes)`);
await prisma.$disconnect();
