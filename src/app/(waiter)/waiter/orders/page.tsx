import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/guard";
import { WaiterPageHeader } from "@/components/waiter/waiter-page-header";
import { MarkServedButton } from "@/components/waiter/table-detail-actions";
import { prisma } from "@/lib/prisma";
import { formatOrderNumber } from "@/lib/format-datetime";
import { RelativeMins } from "@/components/shared/relative-mins";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";
import type { OrderStatus } from "@prisma/client";

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

function itemsSummary(
  items: {
    quantity: number;
    nameSnapshot: string;
    categorySnapshot: string;
  }[],
) {
  return items
    .slice(0, 3)
    .map((i) => {
      const cat = i.categorySnapshot.trim();
      const label = cat ? `${cat} · ${i.nameSnapshot}` : i.nameSnapshot;
      return `${i.quantity}× ${label}`;
    })
    .join(" • ");
}

export default async function WaiterOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;

  // «طلباتي» يحتاج المعرّف أولاً؛ باقي الفلاتر توازي البروفايل مع الاستعلام
  let profile = filter === "mine" ? await getCurrentProfile() : null;

  const ordersPromise = prisma.order.findMany({
    where: {
      status: { not: "CANCELLED" },
      bill: { status: "OPEN" },
      ...(filter === "mine" && profile ? { createdById: profile.id } : {}),
      ...(filter === "ready" ? { status: "READY" } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      dailyNumber: true,
      status: true,
      createdAt: true,
      createdById: true,
      table: { select: { id: true, label: true } },
      createdBy: { select: { fullName: true } },
      items: {
        where: { status: "ACTIVE" },
        select: {
          quantity: true,
          nameSnapshot: true,
          categorySnapshot: true,
        },
        take: 4,
      },
    },
  });

  const [orders, maybeProfile] = await Promise.all([
    ordersPromise,
    profile ? Promise.resolve(profile) : getCurrentProfile(),
  ]);
  profile = maybeProfile;

  const readyCount = orders.filter((o) => o.status === "READY").length;
  const activeFilter = !filter || filter === "all" ? "all" : filter;

  const filters: { key: string; href: string; label: string }[] = [
    { key: "all", href: "/waiter/orders", label: t("orders.filterAll") },
    {
      key: "mine",
      href: "/waiter/orders?filter=mine",
      label: t("order.myOrders"),
    },
    {
      key: "ready",
      href: "/waiter/orders?filter=ready",
      label:
        readyCount > 0
          ? `${t("order.filterReady")} (${readyCount})`
          : t("order.filterReady"),
    },
  ];

  return (
    <div className="pb-4">
      <WaiterPageHeader
        title={t("orders.title")}
        subtitle={t("orders.todayCount", { n: orders.length })}
      />

      <div className="flex flex-wrap gap-2 px-4 pt-3 pb-4">
        {filters.map((f) => {
          const active = activeFilter === f.key;
          return (
            <Link
              key={f.key}
              href={f.href}
              className={cn(
                "min-h-11 rounded-full px-5 text-sm font-semibold transition-colors inline-flex items-center",
                active
                  ? "bg-brand-amber text-black"
                  : "bg-muted text-foreground"
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground mx-4 rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          {t("empty.orders")}
        </p>
      ) : (
        <ul className="space-y-3 px-4">
          {orders.map((o) => {
            const mine = profile && o.createdById === profile.id;
            const href = o.table
              ? `/waiter/table/${o.table.id}`
              : "/waiter/orders";
            const summary = itemsSummary(o.items);

            return (
              <li key={o.id} className="flex items-stretch gap-2">
                <Link
                  href={href}
                  className={cn(
                    "bg-card border-border flex min-w-0 flex-1 items-center gap-3 rounded-2xl border p-3 shadow-sm",
                    o.status === "READY" &&
                      "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30",
                  )}
                >
                  <div className="flex size-[4.5rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-charcoal text-white ring-1 ring-brand-gold/30">
                    <span className="text-xs opacity-80">
                      {t("tables.noun")}
                    </span>
                    <span className="text-2xl font-bold leading-none">
                      {o.table?.label ?? t("tables.unlabeled")}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold tracking-tight">
                      <bdi dir="ltr">{formatOrderNumber(o.dailyNumber)}</bdi>
                    </p>
                    <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
                      {summary || t("empty.generic")}
                      {" • "}
                      <RelativeMins
                        iso={o.createdAt.toISOString()}
                        mode="ago"
                      />
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm font-medium",
                        statusLineClass(o.status)
                      )}
                    >
                      {statusLabel(o.status)}
                      {" • "}
                      {mine
                        ? t("orders.mineBadge")
                        : t("orders.byWaiter", {
                            name: o.createdBy.fullName,
                          })}
                    </p>
                  </div>

                  <ChevronLeft
                    className="text-muted-foreground size-5 shrink-0"
                    aria-hidden
                  />
                </Link>
                {o.status === "READY" ? (
                  <div className="flex items-center">
                    <MarkServedButton orderId={o.id} compact />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
