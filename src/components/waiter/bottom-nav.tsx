"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

export function WaiterBottomNav({ readyCount = 0 }: { readyCount?: number }) {
  const pathname = usePathname();
  const onTables = pathname === "/waiter" || pathname.startsWith("/waiter/table");
  const onOrders =
    pathname.startsWith("/waiter/orders") || pathname.startsWith("/waiter/new");

  return (
    <nav className="border-border bg-background fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex w-full max-w-5xl">
        <Link
          href="/waiter"
          className={cn(
            "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
            onTables ? "text-brand-amber" : "text-muted-foreground"
          )}
        >
          <LayoutGrid className="size-5" />
          {t("nav.tables")}
        </Link>
        <Link
          href="/waiter/orders"
          className={cn(
            "relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
            onOrders ? "text-brand-amber" : "text-muted-foreground"
          )}
        >
          <span className="relative">
            <ScrollText className="size-5" />
            {readyCount > 0 ? (
              <span className="absolute -top-1.5 -end-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                <bdi dir="ltr">{readyCount > 9 ? "9+" : readyCount}</bdi>
              </span>
            ) : null}
          </span>
          {t("nav.orders")}
        </Link>
      </div>
    </nav>
  );
}
