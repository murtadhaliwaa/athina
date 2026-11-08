/**
 * يولّد أيقونات PWA من الشعار الشفاف public/brand/athena-logo.png
 * لإعادة قص الخلفية من الأصل: node scripts/process-athena-logo.mjs
 */
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const master = join(root, "public", "brand", "athena-logo.png");
const iconsDir = join(root, "public", "icons");
mkdirSync(iconsDir, { recursive: true });

if (!existsSync(master)) {
  console.error("الشعار غير موجود — شغّل: node scripts/process-athena-logo.mjs");
  process.exit(1);
}

async function writeIcon(name, size, { opaque = false, padRatio = 0.1 } = {}) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const offset = Math.round((size - inner) / 2);
  const logo = await sharp(master)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: opaque
        ? { r: 0, g: 0, b: 0, alpha: 255 }
        : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo, left: offset, top: offset }])
    .png()
    .toFile(join(iconsDir, name));
}

await writeIcon("192.png", 192, { padRatio: 0.1 });
await writeIcon("512.png", 512, { padRatio: 0.1 });
await writeIcon("maskable-512.png", 512, { opaque: true, padRatio: 0.18 });

console.log("Wrote PWA icons to public/icons");
