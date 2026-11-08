import type { OrderStatus } from "@prisma/client";
import { t } from "@/lib/i18n/ar-iq";
import { cn } from "@/lib/utils";

const styles: Record<OrderStatus, string> = {
  NEW: "bg-sky-500/15 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
  PREPARING:
    "bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300",
  READY:
    "bg-emerald-500/15 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-300",
  SERVED: "bg-zinc-500/15 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-400",
  CANCELLED: "bg-red-500/15 text-red-800 dark:bg-red-500/20 dark:text-red-300",
};

const labels: Record<OrderStatus, Parameters<typeof t>[0]> = {
  NEW: "status.NEW",
  PREPARING: "status.PREPARING",
  READY: "status.READY",
  SERVED: "status.SERVED",
  CANCELLED: "status.CANCELLED",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[status],
        className,
      )}
    >
      {t(labels[status])}
    </span>
  );
}
