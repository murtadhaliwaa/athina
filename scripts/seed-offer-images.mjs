/**
 * صور عروض أثينا — نفس مسار المنيو (webp → menu-images)
 * تشغيل: node scripts/seed-offer-images.mjs
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

/** نااار = أحمر · خاص = أزرق */
const OFFER_IMAGES = {
  "عرض خاااص": resolve(__dirname, "../assets/menu/offer-special-crepe-blue.jpg"),
  "عرض نااااار": resolve(__dirname, "../assets/menu/offer-fire-hookah-red.jpg"),
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

async function toMenuWebp(filePath) {
  if (!existsSync(filePath)) throw new Error(`الملف غير موجود: ${filePath}`);
  const raw = readFileSync(filePath);
  return sharp(raw)
    .rotate()
    .resize(800, 800, { fit: "cover", position: "centre" })
    .webp({ quality: 78 })
    .toBuffer();
}

const supabase = admin();
const offers = await prisma.offer.findMany({
  where: { name: { in: Object.keys(OFFER_IMAGES) } },
  select: {
    id: true,
    name: true,
    menuItem: { select: { id: true, imagePath: true } },
  },
});

if (offers.length === 0) {
  console.error("ماكو عروض مطابقة — شغّل seed-athina-offers أولاً");
  process.exit(1);
}

for (const offer of offers) {
  const localPath = OFFER_IMAGES[offer.name];
  const webp = await toMenuWebp(localPath);
  const path = `athena/offers/${offer.menuItem.id}-${Date.now()}.webp`;

  if (offer.menuItem.imagePath) {
    await supabase.storage
      .from("menu-images")
      .remove([offer.menuItem.imagePath]);
  }

  const { error } = await supabase.storage
    .from("menu-images")
    .upload(path, webp, { contentType: "image/webp", upsert: true });
  if (error) throw error;

  await prisma.menuItem.update({
    where: { id: offer.menuItem.id },
    data: { imagePath: path },
  });
  console.log(`صورة: ${offer.name} ← ${localPath.split(/[/\\]/).pop()}`);
}

await prisma.$disconnect();
console.log("تم رفع صور العروض.");
