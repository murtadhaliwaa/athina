"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { fetchWaiterTableCards } from "@/actions/waiter-tables";
import type { WaiterTableCard } from "@/lib/queries/waiter-tables";
import { MoneyBdi } from "@/components/shared/money-bdi";
import { RelativeMins } from "@/components/shared/relative-mins";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

export function WaiterTablesGrid({
  initialCards,
}: {
  initialCards: WaiterTableCard[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [, startTransition] = useTransition();
  const inflight = useRef(false);

  const sync = useCallback(() => {
    if (inflight.current) return;
    inflight.current = true;
    startTransition(async () => {
      try {
        const res = await fetchWaiterTableCards();
        if (res.ok) setCards(res.cards);
      } finally {
        inflight.current = false;
      }
    });
  }, []);

  useRealtimeRefresh(["orders", "bills"], sync, {
    debounceMs: 700,
    backupMs: 120_000,
  });

  const summaryBusy = cards.filter(
    (c) => c.state === "busy" || c.state === "ready" || c.state === "cancel",
  ).length;
  const summaryReady = cards.filter((c) => c.state === "ready").length;
  const summaryFree = cards.filter((c) => c.state === "free").length;

  return (
    <>
      <p className="text-muted-foreground px-4 pt-3 pb-3 text-sm">
        {t("tables.summary", {
          busy: summaryBusy,
          ready: summaryReady,
          free: summaryFree,
        })}
      </p>

      <div className="grid grid-cols-3 gap-2.5 px-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className={cn(
              "flex min-h-[6.5rem] flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center transition-colors",
              card.state === "free" &&
                "bg-muted text-muted-foreground border-border",
              card.state === "busy" &&
                "border-brand-amber/40 bg-brand-charcoal text-white dark:bg-[#1A1612]",
              card.state === "ready" &&
                "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-500/30 dark:bg-[#143D28] dark:text-emerald-300 dark:ring-emerald-500/40",
              card.state === "cancel" &&
                "bg-red-100 text-red-900 dark:bg-[#3D1A1A] dark:text-red-300",
            )}
          >
            <span
              className={cn(
                "text-2xl font-bold leading-none",
                card.state === "ready" && "text-emerald-800 dark:text-emerald-300",
                card.state === "cancel" && "text-red-800 dark:text-red-300",
              )}
            >
              {card.label}
            </span>
            <span className="mt-2 text-xs font-medium">
              {card.state === "free" && t("tables.free")}
              {card.state === "cancel" && t("order.cancelPending")}
              {card.state === "ready" && t("tables.readyShort")}
              {card.state === "busy" &&
                (card.orderCount === 1
                  ? t("tables.orderOne")
                  : t("tables.ordersCount", { n: card.orderCount }))}
            </span>
            {card.state === "busy" && card.total > 0 ? (
              <span className="mt-1 text-xs opacity-90">
                <MoneyBdi amount={card.total} />
              </span>
            ) : null}
            {card.state === "ready" && card.readySince ? (
              <RelativeMins
                iso={card.readySince}
                className="mt-1 text-xs opacity-90"
              />
            ) : null}
          </Link>
        ))}
      </div>
    </>
  );
}
