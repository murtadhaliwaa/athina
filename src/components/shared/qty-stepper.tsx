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
  size = "md",
  className,
}: {
  quantity: number;
  disabled?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const compact = size === "sm";
  return (
    <div
      className={cn(
        "bg-secondary inline-flex shrink-0 items-stretch overflow-hidden rounded-lg",
        compact ? "h-7" : "h-10 rounded-xl",
        className,
      )}
      role="group"
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={decreaseLabel ?? t("action.decreaseQty")}
        onClick={onDecrease}
        className={cn(
          "text-foreground inline-flex items-center justify-center transition-colors hover:bg-black/10 disabled:opacity-40 dark:hover:bg-white/10",
          compact ? "w-7" : "w-10",
        )}
      >
        <Minus
          className={compact ? "size-3" : "size-4"}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>
      <bdi
        dir="ltr"
        className={cn(
          "text-brand-amber inline-flex items-center justify-center px-1 font-bold tabular-nums",
          compact ? "min-w-6 text-xs" : "min-w-9 text-sm",
        )}
      >
        {quantity}
      </bdi>
      <button
        type="button"
        disabled={disabled || quantity >= 99}
        aria-label={t("action.increaseQty")}
        onClick={onIncrease}
        className={cn(
          "text-foreground inline-flex items-center justify-center transition-colors hover:bg-black/10 disabled:opacity-40 dark:hover:bg-white/10",
          compact ? "w-7" : "w-10",
        )}
      >
        <Plus
          className={compact ? "size-3" : "size-4"}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>
    </div>
  );
}
