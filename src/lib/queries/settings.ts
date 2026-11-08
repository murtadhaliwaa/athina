import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/** إعدادات الكوفي نادراً ما تتغير — كاش قصير يزيل رحلة DB في كل صفحة */
export function getCafeSettings() {
  return unstable_cache(
    async () =>
      prisma.cafeSettings.findUnique({
        where: { id: 1 },
        select: {
          id: true,
          cafeName: true,
          businessDayStartHour: true,
          phone: true,
          address: true,
          receiptFooter: true,
        },
      }),
    ["cafe-settings-v1"],
    { tags: ["settings"], revalidate: 120 }
  )();
}
