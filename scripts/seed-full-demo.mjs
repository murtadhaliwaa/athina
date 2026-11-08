/**
 * تعبئة كاملة للمشروع ببيانات افتراضية (منيو أثينا + إدارة + كابتن/كاشير)
 * تشغيل: npm run db:seed:full
 */
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(script, label) {
  console.log(`\n── ${label} ──`);
  const r = spawnSync(process.execPath, [join(root, "scripts", script)], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(`فشل: ${script}`);
    process.exit(r.status ?? 1);
  }
}

run("seed-menu.mjs", "منيو أثينا");
run("seed-owner-demo.mjs", "تقارير ولوحة المالك");
run("seed-waiter-demo.mjs", "طلبات حية للكابتن/الكاشير");
run("ensure-open-shift.mjs", "شفت مفتوح");

console.log("\n✓ المشروع ممتلئ ببيانات افتراضية. حدّث الشاشات.");
