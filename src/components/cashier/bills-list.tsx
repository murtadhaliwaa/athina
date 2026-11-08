"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { MoneyBdi } from "@/components/shared/money-bdi";
import { PageHeader } from "@/components/shared/page-header";
import { RelativeMins } from "@/components/shared/relative-mins";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

export type OpenBillCard = {
  id: string;
  total: number;
  openedAt: string;
  tableLabel: string | null;
  ordersCount: number;
  allReady: boolean;
};

export function BillsList({
  bills,
  cashierName,
  shiftOpen,
}: {
  bills: OpenBillCard[];
  cashierName: string;
  shiftOpen: boolean;
}) {
  return (
    <div className="pb-4">
      <PageHeader
        title={t("nav.bills")}
        statusOk={shiftOpen}
        subtitle={`${cashierName} • ${shiftOpen ? t("shift.openStatus") : t("shift.closed")}`}
      />

      <p className="text-muted-foreground px-4 pt-3 pb-3 text-sm">
        {t("bill.openCount", { n: bills.length })}
      </p>

      {bills.length === 0 ? (
        <p className="text-muted-foreground px-4 py-10 text-center">
          {t("empty.generic")}
        </p>
      ) : (
        <ul className="space-y-3 px-4">
          {bills.map((bill) => {
            const ordersLabel =
              bill.ordersCount === 1
                ? t("tables.orderOne")
                : t("tables.ordersCount", { n: bill.ordersCount });
            return (
              <li key={bill.id}>
                <Link
                  href={`/cashier/bills/${bill.id}`}
                  className={cn(
                    "bg-card border-border flex items-center gap-3 rounded-2xl border p-3 shadow-sm",
                    bill.allReady &&
                      "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30",
                  )}
                >
                  <div className="flex size-[4.5rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-charcoal text-white ring-1 ring-brand-gold/30">
                    <span className="text-xs opacity-80">
                      {t("tables.noun")}
                    </span>
                    <span className="text-2xl font-bold leading-none">
                      {bill.tableLabel ?? t("tables.unlabeled")}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold tracking-tight">
                      <MoneyBdi amount={bill.total} />
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {ordersLabel}
                      {" • "}
                      <RelativeMins
                        iso={bill.openedAt}
                        mode="openDuration"
                      />
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm font-medium",
                        bill.allReady ? "text-emerald-500" : "text-brand-amber",
                      )}
                    >
                      {bill.allReady
                        ? t("bill.ordersAllReady")
                        : t("bill.ordersNotReady")}
                    </p>
                  </div>

                  <ChevronLeft
                    className="text-muted-foreground size-5 shrink-0"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
