import type { ReactNode } from "react";
import Link from "next/link";
import { MoneyBdi } from "@/components/shared/money-bdi";
import { PageHeader } from "@/components/shared/page-header";
import {
  formatBaghdadDateLong,
  formatBaghdadTime,
  formatHourShort,
} from "@/lib/time";
import { cn } from "@/lib/utils";
import { t, type ArIqKey } from "@/lib/i18n/ar-iq";
import type { getDashboardKpis } from "@/actions/reports";
import type { ReportPreset } from "@/lib/reports/date-range";

type Kpis = Awaited<ReturnType<typeof getDashboardKpis>>;

const PRESETS: {
  id: Exclude<ReportPreset, "custom">;
  labelKey: ArIqKey;
}[] = [
  { id: "today", labelKey: "reports.presetToday" },
  { id: "yesterday", labelKey: "reports.presetYesterday" },
  { id: "last7", labelKey: "reports.presetLast7Short" },
  { id: "thisMonth", labelKey: "reports.presetThisMonthShort" },
];

function salesTitle(preset: ReportPreset): string {
  if (preset === "yesterday") return t("reports.kpiSalesYesterday");
  if (preset === "last7") return t("reports.kpiSalesLast7");
  if (preset === "thisMonth") return t("reports.kpiSalesMonth");
  return t("reports.kpiSales");
}

function shiftDiffLabel(diff: number): {
  text: string;
  tone: "short" | "over" | "ok";
} {
  if (diff < 0) {
    return {
      text: t("reports.shiftShort", {
        amount: Math.abs(diff).toLocaleString("en-US"),
      }),
      tone: "short",
    };
  }
  if (diff > 0) {
    return {
      text: t("reports.shiftOver", { amount: diff.toLocaleString("en-US") }),
      tone: "over",
    };
  }
  return { text: t("reports.shiftExact"), tone: "ok" };
}

export function DashboardView({ data }: { data: Kpis }) {
  const maxTop = Math.max(1, ...data.topItems.map((i) => i.quantity));
  const maxHourly = Math.max(1, ...data.hourlySales.map((h) => h.total));
  const hasHourly = data.hourlySales.some((h) => h.total > 0);
  const activeHours = data.hourlySales
    .filter((h) => h.total > 0)
    .map((h) => h.hour);
  const hourlyChart = (() => {
    if (activeHours.length === 0) return [] as typeof data.hourlySales;
    const first = Math.min(...activeHours);
    const last = Math.max(...activeHours);
    return data.hourlySales.filter((h) => h.hour >= first && h.hour <= last);
  })();
  const attentionRows: {
    key: string;
    label: string;
    href: string;
    badge: ReactNode;
  }[] = [];

  if (data.lastShiftDifference != null) {
    const diff = shiftDiffLabel(data.lastShiftDifference);
    attentionRows.push({
      key: "last-shift",
      label: t("reports.lastShiftClose"),
      href: "/owner/reports/shifts",
      badge: (
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            diff.tone === "short" && "bg-[#C45C5C] text-white",
            diff.tone === "over" && "bg-emerald-600 text-white",
            diff.tone === "ok" && "bg-muted text-foreground",
          )}
        >
          <bdi dir="ltr">{diff.text}</bdi>
        </span>
      ),
    });
  }

  if (data.shiftOpen && data.shiftOpenedAt) {
    attentionRows.push({
      key: "open-shift",
      label: t("reports.shiftOpenSince", {
        time: formatBaghdadTime(new Date(data.shiftOpenedAt)),
      }),
      href: "/owner/reports/shifts",
      badge: (
        <span className="rounded-full bg-brand-gold/20 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {data.shiftCashierName ?? t("reports.kpiShift")}
        </span>
      ),
    });
  }

  if (data.soldOutCount > 0) {
    attentionRows.push({
      key: "sold-out",
      label: t("reports.soldOutItems"),
      href: "/owner/menu",
      badge: (
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-amber text-sm font-bold text-black">
          <bdi dir="ltr">{data.soldOutCount}</bdi>
        </span>
      ),
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-4 pt-3">
      <PageHeader
        title={t("nav.dashboard")}
        subtitle={`${t("reports.businessDay")}: ${formatBaghdadDateLong(data.businessDate)}`}
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PRESETS.map((p) => {
          const active = data.preset === p.id;
          return (
            <Link
              key={p.id}
              href={p.id === "today" ? "/owner" : `/owner?preset=${p.id}`}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-amber text-black"
                  : "border border-border text-muted-foreground",
              )}
            >
              {t(p.labelKey)}
            </Link>
          );
        })}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">{salesTitle(data.preset)}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
          <MoneyBdi amount={data.salesTotal} />
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("reports.kpiPaidBills", { n: data.billCount })}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <KpiTile
          label={t("reports.kpiAvgBill")}
          value={<MoneyBdi amount={data.avgBill} />}
        />
        <KpiTile
          label={t("reports.kpiDiscountsCount", { n: data.discountCount })}
          value={<MoneyBdi amount={data.discountTotal} />}
        />
        <KpiTile
          label={t("reports.kpiCancellationsCount", {
            n: data.cancellationCount,
          })}
          value={<MoneyBdi amount={data.cancellationValue} />}
        />
        <KpiTile
          label={t("reports.kpiOpenBills")}
          value={<bdi dir="ltr">{data.openBills}</bdi>}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          {t("reports.needsAttention")}
        </h2>
        {attentionRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("reports.noAttention")}</p>
        ) : (
          <ul className="space-y-1">
            {attentionRows.map((row) => (
              <li key={row.key}>
                <Link
                  href={row.href}
                  className="flex items-center justify-between gap-3 rounded-xl px-1 py-3.5"
                >
                  <span className="text-sm text-foreground">{row.label}</span>
                  <span className="shrink-0">{row.badge}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          {t("reports.topItems")}
        </h2>
        {data.topItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("reports.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {data.topItems.map((item) => (
              <li key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-foreground">{item.name}</span>
                  <bdi dir="ltr" className="font-medium text-foreground">
                    {item.quantity}
                  </bdi>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-brand-gold/15">
                  <div
                    className="h-full rounded-full bg-brand-amber"
                    style={{ width: `${(item.quantity / maxTop) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          {t("reports.hourlySales")}
        </h2>
        {!hasHourly ? (
          <p className="text-sm text-muted-foreground">{t("reports.empty")}</p>
        ) : (
          <div className="flex gap-0.5" dir="rtl">
            {hourlyChart.map((h) => {
              const px =
                h.total > 0
                  ? Math.max(4, Math.round((h.total / maxHourly) * 144))
                  : 0;
              return (
                <div
                  key={h.hour}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                  title={`${formatHourShort(h.hour)} — ${h.total.toLocaleString("en-US")}`}
                >
                  <div className="flex h-36 w-full flex-col justify-end">
                    <div
                      className="w-full rounded-t-sm bg-brand-amber"
                      style={{ height: px }}
                    />
                  </div>
                  <span className="w-full text-center text-[8px] leading-tight text-muted-foreground">
                    {formatHourShort(h.hour)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
