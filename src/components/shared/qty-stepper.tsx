"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

/**
 * عدّاد كمية مضغوط للبطاقات — مجموعة واحدة متماسكة، مناسبة للمس.
 */
export function QtyStepper({
  quantity,
  disabled,
  onDecrease,
  onIncrease,
  decreaseLabel,
  className,
}: {
  quantity: number;
  disabled?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-secondary inline-flex h-10 shrink-0 items-stretch overflow-hidden rounded-xl",
        className,
      )}
      role="group"
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={decreaseLabel ?? t("action.decreaseQty")}
        onClick={onDecrease}
        className="text-foreground inline-flex w-10 items-center justify-center transition-colors hover:bg-black/10 disabled:opacity-40 dark:hover:bg-white/10"
      >
        <Minus className="size-4" strokeWidth={2.25} aria-hidden />
      </button>
      <bdi
        dir="ltr"
        className="text-brand-amber inline-flex min-w-9 items-center justify-center px-1 text-sm font-bold tabular-nums"
      >
        {quantity}
      </bdi>
      <button
        type="button"
        disabled={disabled || quantity >= 99}
        aria-label={t("action.increaseQty")}
        onClick={onIncrease}
        className="text-foreground inline-flex w-10 items-center justify-center transition-colors hover:bg-black/10 disabled:opacity-40 dark:hover:bg-white/10"
      >
        <Plus className="size-4" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}
