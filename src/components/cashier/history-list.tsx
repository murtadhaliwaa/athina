"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { MoneyBdi } from "@/components/shared/money-bdi";
import { PageHeader } from "@/components/shared/page-header";
import { formatOrderNumber } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

export type HistoryOrderCard = {
  id: string;
  billId: string;
  dailyNumber: number;
  status: OrderStatus;
  tableLabel: string | null;
};

export type HistoryPaidBillCard = {
  id: string;
  total: number;
  tableLabel: string | null;
};

type Filter = "all" | "orders" | "paid";

function statusLineClass(status: OrderStatus) {
  switch (status) {
    case "READY":
      return "text-emerald-500";
    case "NEW":
      return "text-sky-400";
    case "PREPARING":
      return "text-brand-amber";
    case "SERVED":
      return "text-muted-foreground";
    default:
      return "text-destructive";
  }
}

function statusLabel(status: OrderStatus) {
  switch (status) {
    case "NEW":
      return t("status.NEW");
    case "PREPARING":
      return t("status.PREPARING");
    case "READY":
      return t("status.READY");
    case "SERVED":
      return t("status.SERVED");
    default:
      return t("status.CANCELLED");
  }
}

function TableBadge({ tableLabel }: { tableLabel: string | null }) {
  return (
    <div className="flex size-[4.5rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-charcoal text-white ring-1 ring-brand-gold/30">
      <span className="text-xs opacity-80">{t("tables.noun")}</span>
      <span className="text-2xl font-bold leading-none">
        {tableLabel ?? t("tables.unlabeled")}
      </span>
    </div>
  );
}

export function HistoryList({
  orders,
  paidBills,
  cashierName,
  shiftOpen,
  initialQuery,
}: {
  orders: HistoryOrderCard[];
  paidBills: HistoryPaidBillCard[];
  cashierName: string;
  shiftOpen: boolean;
  initialQuery: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState(initialQuery);

  const query = q.trim();

  const filteredOrders = useMemo(() => {
    if (!query) return orders;
    return orders.filter((o) => {
      const num = String(o.dailyNumber);
      const table = o.tableLabel ?? "";
      return num.includes(query) || table.includes(query);
    });
  }, [orders, query]);

  const filteredPaid = useMemo(() => {
    if (!query) return paidBills;
    return paidBills.filter((b) => {
      const table = b.tableLabel ?? "";
      return table.includes(query) || String(b.total).includes(query);
    });
  }, [paidBills, query]);

  const showOrders = filter === "all" || filter === "orders";
  const showPaid = filter === "all" || filter === "paid";

  const visibleCount =
    (showOrders ? filteredOrders.length : 0) +
    (showPaid ? filteredPaid.length : 0);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: t("orders.filterAll") },
    { key: "orders", label: t("nav.orders") },
    { key: "paid", label: t("bill.paid") },
  ];

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    const qs = params.toString();
    router.replace(qs ? `/cashier/history?${qs}` : "/cashier/history");
  };

  return (
    <div className="pb-4">
      <PageHeader
        title={t("cashier.history")}
        statusOk={shiftOpen}
        subtitle={`${cashierName} • ${shiftOpen ? t("shift.openStatus") : t("shift.closed")}`}
      />

      <form onSubmit={onSearchSubmit} className="px-4 pt-2">
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("history.search")}
          className="border-border bg-muted/40 h-11 w-full rounded-2xl border px-4 text-base"
        />
      </form>

      <div className="flex flex-wrap gap-2 px-4 pt-3 pb-2">
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "min-h-10 rounded-full px-5 text-sm font-semibold transition-colors",
                active
                  ? "bg-brand-amber text-black"
                  : "bg-muted text-foreground",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <p className="text-muted-foreground px-4 pb-3 text-sm">
        {t("history.resultCount", { n: visibleCount })}
      </p>

      {visibleCount === 0 ? (
        <p className="text-muted-foreground px-4 py-10 text-center">
          {t("empty.generic")}
        </p>
      ) : (
        <ul className="space-y-3 px-4">
          {showOrders &&
            filteredOrders.map((o) => (
              <li key={`o-${o.id}`}>
                <Link
                  href={`/cashier/bills/${o.billId}`}
                  className={cn(
                    "bg-card border-border flex items-center gap-3 rounded-2xl border p-3 shadow-sm",
                    o.status === "READY" &&
                      "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30",
                  )}
                >
                  <TableBadge tableLabel={o.tableLabel} />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold tracking-tight">
                      <bdi dir="ltr">{formatOrderNumber(o.dailyNumber)}</bdi>
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {t("nav.orders")}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm font-medium",
                        statusLineClass(o.status),
                      )}
                    >
                      {statusLabel(o.status)}
                    </p>
                  </div>
                  <ChevronLeft
                    className="text-muted-foreground size-5 shrink-0"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}

          {showPaid &&
            filteredPaid.map((b) => (
              <li key={`b-${b.id}`}>
                <Link
                  href={`/cashier/bills/${b.id}`}
                  className="bg-card border-border flex items-center gap-3 rounded-2xl border p-3 shadow-sm"
                >
                  <TableBadge tableLabel={b.tableLabel} />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold tracking-tight">
                      <MoneyBdi amount={b.total} />
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {t("nav.bills")}
                    </p>
                    <p className="mt-1 text-sm font-medium text-emerald-500">
                      {t("bill.paid")}
                    </p>
                  </div>
                  <ChevronLeft
                    className="text-muted-foreground size-5 shrink-0"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
