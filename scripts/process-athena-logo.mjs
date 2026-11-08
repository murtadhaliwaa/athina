/**
 * يزيل الخلفية السوداء (flood من الحواف) ويبقي الشعار،
 * ثم يولّد أيقونات PWA + أيقونة التطبيق.
 */
import sharp from "sharp";
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const srcPath = join(
  process.env.USERPROFILE || "",
  ".cursor",
  "projects",
  "c-Users-LPQ-Desktop-coffee",
  "assets",
  "ChatGPT_Image_Nov_9__2026__01_04_30_AM-441303fd-8b50-4375-97c7-466fbc4980e3.png",
);

const BLACK_MAX = 28; // قريب من الأسود يُعتبر خلفية
const iconsDir = join(root, "public", "icons");
const brandDir = join(root, "public", "brand");
const appDir = join(root, "src", "app");
mkdirSync(iconsDir, { recursive: true });
mkdirSync(brandDir, { recursive: true });

function isBg(r, g, b, a) {
  if (a < 8) return true;
  return r <= BLACK_MAX && g <= BLACK_MAX && b <= BLACK_MAX;
}

function floodTransparent(width, height, data) {
  const n = width * height;
  const visited = new Uint8Array(n);
  const stack = [];

  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    const o = i * 4;
    if (!isBg(data[o], data[o + 1], data[o + 2], data[o + 3])) return;
    visited[i] = 1;
    stack.push(i);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (stack.length) {
    const i = stack.pop();
    const o = i * 4;
    data[o + 3] = 0;
    const x = i % width;
    const y = (i / width) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
}

function contentBox(width, height, data) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a < 16) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return { left: 0, top: 0, width, height };
  const pad = Math.round(Math.max(width, height) * 0.03);
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(width - 1, maxX + pad);
  const bottom = Math.min(height - 1, maxY + pad);
  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

const { data, info } = await sharp(srcPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const rgba = Buffer.from(data);
floodTransparent(info.width, info.height, rgba);
const box = contentBox(info.width, info.height, rgba);

const transparentMaster = await sharp(rgba, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .extract(box)
  .png()
  .toBuffer();

const masterPath = join(brandDir, "athena-logo.png");
await sharp(transparentMaster).png().toFile(masterPath);

async function squareIcon(size, { opaqueBg = null, padRatio = 0.12 } = {}) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const logo = await sharp(transparentMaster)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const base = opaqueBg
    ? {
        create: {
          width: size,
          height: size,
          channels: 4,
          background: opaqueBg,
        },
      }
    : {
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      };

  const offset = Math.round((size - inner) / 2);
  return sharp(base)
    .composite([{ input: logo, left: offset, top: offset }])
    .png()
    .toBuffer();
}

const icon192 = await squareIcon(192, { padRatio: 0.1 });
const icon512 = await squareIcon(512, { padRatio: 0.1 });
// maskable يحتاج خلفية غير شفافة لمنع قصّ سيء على أندرويد
const maskable = await squareIcon(512, {
  opaqueBg: { r: 0, g: 0, b: 0, alpha: 255 },
  padRatio: 0.18,
});
const appIcon = await squareIcon(512, { padRatio: 0.08 });
const appleIcon = await squareIcon(180, {
  opaqueBg: { r: 0, g: 0, b: 0, alpha: 255 },
  padRatio: 0.12,
});

await sharp(icon192).toFile(join(iconsDir, "192.png"));
await sharp(icon512).toFile(join(iconsDir, "512.png"));
await sharp(maskable).toFile(join(iconsDir, "maskable-512.png"));
await sharp(appIcon).toFile(join(appDir, "icon.png"));
await sharp(appleIcon).toFile(join(appDir, "apple-icon.png"));

// favicon متعدد الأحجام
await sharp(await squareIcon(32, { padRatio: 0.08 }))
  .resize(32, 32)
  .png()
  .toFile(join(appDir, "favicon.ico"));

console.log("OK", {
  master: masterPath,
  icons: ["192", "512", "maskable-512"],
  app: ["icon.png", "apple-icon.png", "favicon.ico"],
});
