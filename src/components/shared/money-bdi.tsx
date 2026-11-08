import { t } from "@/lib/i18n/ar-iq";

/** مبلغ مع د.ع مثبتة يسار الرقم (flex يتجاوز قلب Unicode) */
export function MoneyBdi({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  return (
    <span
      dir="ltr"
      className={
        className
          ? `inline-flex items-baseline gap-1 tabular-nums ${className}`
          : "inline-flex items-baseline gap-1 tabular-nums"
      }
    >
      <span>{t("menu.currency")}</span>
      <span>{amount.toLocaleString("en-US")}</span>
    </span>
  );
}
