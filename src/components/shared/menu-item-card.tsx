"use client";

import { memo } from "react";
import Image from "next/image";
import { menuImagePublicUrl } from "@/lib/menu/image-url";
import { resolveItemAccent } from "@/lib/menu/item-accent";
import { MoneyBdi } from "@/components/shared/money-bdi";
import { t } from "@/lib/i18n/ar-iq";
import { cn } from "@/lib/utils";

export type MenuItemCardData = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imagePath: string | null;
  updatedAt?: string | Date | null;
  isAvailable: boolean;
};

export const MenuItemCard = memo(function MenuItemCard({
  item,
  categoryName,
  quantity,
  onAdd,
  priority = false,
}: {
  item: MenuItemCardData;
  categoryName: string;
  quantity: number;
  onAdd: () => void;
  /** أول بطاقات فوق الطيّة — LCP */
  priority?: boolean;
}) {
  const url = menuImagePublicUrl(item.imagePath, item.updatedAt);
  const accent = resolveItemAccent(item.name, categoryName);

  return (
    <button
      type="button"
      disabled={!item.isAvailable}
      onClick={onAdd}
      aria-label={t("order.addToCart")}
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-[1.75rem] text-start text-white shadow-md",
        "transition-transform active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-55",
      )}
      style={{ backgroundColor: accent }}
    >
      <div className="relative aspect-[4/3] w-full shrink-0">
        {url ? (
          <Image
            src={url}
            alt=""
            fill
            sizes="(max-width: 768px) 45vw, 220px"
            quality={55}
            unoptimized
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            className="object-cover"
          />
        ) : (
          <div className="size-full bg-black/25" />
        )}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
          style={{
            background: `linear-gradient(to top, ${accent} 0%, transparent 100%)`,
          }}
        />
        {!item.isAvailable && (
          <span className="absolute start-2.5 top-2.5 rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
            {t("item.soldOut")}
          </span>
        )}
        {quantity > 0 && (
          <span className="absolute end-2.5 top-2.5 grid size-7 place-items-center rounded-full bg-black/50 text-sm font-semibold leading-none backdrop-blur-sm">
            <bdi dir="ltr" className="leading-none tabular-nums">
              {quantity}
            </bdi>
          </span>
        )}
      </div>

      <div className="relative z-10 -mt-3 flex flex-1 flex-col gap-1.5 px-3.5 pt-1 pb-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base leading-snug font-bold tracking-tight">
            {item.name}
          </h3>
          <span className="shrink-0 rounded-full bg-black/35 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">
            <MoneyBdi amount={item.price} />
          </span>
        </div>

        {item.description ? (
          <p className="line-clamp-1 text-xs leading-relaxed text-white/85">
            {item.description}
          </p>
        ) : null}

        <span
          className={cn(
            "mt-auto inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-brand-amber py-2 text-sm font-bold text-black",
          )}
        >
          {quantity > 0 ? (
            <span className="inline-flex items-center gap-1.5 leading-none">
              <span>{t("order.addToCart")}</span>
              <bdi dir="ltr" className="tabular-nums">
                ({quantity})
              </bdi>
            </span>
          ) : (
            t("order.addToCart")
          )}
        </span>
      </div>
    </button>
  );
});
