"use client";

import { useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Loader2, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

export function WaiterBottomNav({
  readyCount = 0,
  onNavigating,
}: {
  readyCount?: number;
  onNavigating?: (pending: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onTables =
    pathname === "/waiter" || pathname.startsWith("/waiter/table");
  const onOrders =
    pathname.startsWith("/waiter/orders") || pathname.startsWith("/waiter/new");

  useEffect(() => {
    onNavigating?.(pending);
  }, [pending, onNavigating]);

  function go(href: string, alreadyThere: boolean) {
    if (alreadyThere || pending) return;
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <nav className="border-border bg-background fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex w-full max-w-5xl">
        <button
          type="button"
          onClick={() => go("/waiter", onTables && pathname === "/waiter")}
          disabled={pending}
          className={cn(
            "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-opacity",
            onTables ? "text-brand-amber" : "text-muted-foreground",
            pending && "opacity-70",
          )}
        >
          {pending && !onTables ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <LayoutGrid className="size-5" aria-hidden />
          )}
          {t("nav.tables")}
        </button>
        <button
          type="button"
          onClick={() => go("/waiter/orders", onOrders)}
          disabled={pending}
          className={cn(
            "relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-opacity",
            onOrders ? "text-brand-amber" : "text-muted-foreground",
            pending && "opacity-70",
          )}
        >
          <span className="relative">
            {pending && !onOrders ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <ScrollText className="size-5" aria-hidden />
            )}
            {readyCount > 0 ? (
              <span className="absolute -top-1.5 -end-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                <bdi dir="ltr">{readyCount > 9 ? "9+" : readyCount}</bdi>
              </span>
            ) : null}
          </span>
          {t("nav.orders")}
        </button>
      </div>
    </nav>
  );
}
