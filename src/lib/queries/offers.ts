import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { isOffersCategoryName } from "@/lib/offers/constants";
import {
  formatMinuteAr,
  getBaghdadMinuteOfDay,
  isOfferWindowOpen,
} from "@/lib/offers/window";
import { t } from "@/lib/i18n/ar-iq";

export type ActiveOfferMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imagePath: string | null;
  updatedAt: Date;
  isAvailable: boolean;
  sortOrder: number;
  /** سبب عدم التوفر خارج نافذة الوقت — يظهر بدل «خلصت» */
  unavailableLabel?: string | null;
  /** ساعات العرض للبطاقة: من – إلى */
  windowLabel?: string | null;
  /** لون أسفل البطاقة ليطابق خلفية صورة العرض */
  cardAccent?: string | null;
  /** محتويات الباقة للعرض على البطاقة */
  components?: string[];
};

function offerCardAccent(name: string): string {
  if (/نا+ر/.test(name)) return "#B91C1C";
  if (/خا+ص/.test(name)) return "#1D4ED8";
  return "#1D4ED8";
}

/** كل العروض المفعّلة — ظاهرة دائماً؛ خارج الوقت تبقى مع وسم غير متاح */
export const getActiveOfferMenuItems = cache(async (): Promise<{
  categoryId: string;
  categoryName: string;
  items: ActiveOfferMenuItem[];
} | null> => {
  const now = new Date();
  const minuteNow = getBaghdadMinuteOfDay(now);
  const offers = await prisma.offer.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    select: {
      startMinute: true,
      endMinute: true,
      components: {
        orderBy: { sortOrder: "asc" },
        select: { label: true },
      },
      menuItem: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imagePath: true,
          updatedAt: true,
          isAvailable: true,
          isActive: true,
          sortOrder: true,
          categoryId: true,
          category: { select: { name: true, isActive: true } },
        },
      },
    },
  });

  const items: ActiveOfferMenuItem[] = [];
  let categoryId = "";
  let categoryName = "";

  for (const offer of offers) {
    const item = offer.menuItem;
    if (!item.isActive || !item.category.isActive) continue;
    categoryId = item.categoryId;
    categoryName = item.category.name;

    const windowOpen = isOfferWindowOpen(
      offer.startMinute,
      offer.endMinute,
      now,
    );
    const soldOut = !item.isAvailable;
    let unavailableLabel: string | null = null;
    if (soldOut) {
      unavailableLabel = t("item.soldOut");
    } else if (!windowOpen) {
      unavailableLabel =
        minuteNow >= offer.endMinute
          ? t("offer.unavailableAfter", {
              time: formatMinuteAr(offer.endMinute),
            })
          : t("offer.availableFrom", {
              time: formatMinuteAr(offer.startMinute),
            });
    }

    items.push({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      imagePath: item.imagePath,
      updatedAt: item.updatedAt,
      isAvailable: windowOpen && !soldOut,
      sortOrder: item.sortOrder,
      unavailableLabel,
      windowLabel: t("offer.windowShort", {
        start: formatMinuteAr(offer.startMinute),
        end: formatMinuteAr(offer.endMinute),
      }),
      cardAccent: offerCardAccent(item.name),
      components: offer.components.map((c) => c.label),
    });
  }

  if (items.length === 0) return null;

  // المتاح أولاً ثم حسب الترتيب
  items.sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });

  return {
    categoryId: categoryId || "offers",
    categoryName: isOffersCategoryName(categoryName)
      ? categoryName
      : categoryName || "العروض",
    items,
  };
});
