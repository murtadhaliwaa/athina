"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";
import type { ReportPreset } from "@/lib/reports/date-range";

const presets: {
  id: ReportPreset;
  labelKey: keyof typeof import("@/lib/i18n/ar-iq").arIq;
}[] = [
  { id: "today", labelKey: "reports.presetToday" },
  { id: "yesterday", labelKey: "reports.presetYesterday" },
  { id: "last7", labelKey: "reports.presetLast7" },
  { id: "thisMonth", labelKey: "reports.presetThisMonth" },
  { id: "custom", labelKey: "reports.presetCustom" },
];

export function ReportDateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const preset = (searchParams.get("preset") as ReportPreset) || "today";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const setParams = useCallback(
    (next: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      startTransition(() => {
        router.push(`${pathname}?${p.toString()}`);
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{t("reports.dateFilter")}</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {presets.map((p) => {
          const active = preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={pending}
              onClick={() => setParams({ preset: p.id })}
              className={cn(
                "h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-60",
                active
                  ? "bg-brand-amber text-black"
                  : "border border-brand-gold/25 text-muted-foreground",
              )}
            >
              {t(p.labelKey)}
            </button>
          );
        })}
      </div>
      {preset === "custom" && (
        <div className="flex flex-wrap items-start gap-3 pt-1">
          <div className="min-w-[9rem] flex-1 space-y-1.5">
            <Label htmlFor="from" className="text-xs text-muted-foreground">
              {t("reports.from")}
            </Label>
            <Input
              id="from"
              type="date"
              className="h-11 rounded-xl border-0 bg-card ring-1 ring-border text-base text-foreground"
              defaultValue={from}
              placeholder={t("reports.fromPlaceholder")}
              onBlur={(e) =>
                setParams({ preset: "custom", from: e.target.value, to })
              }
            />
          </div>
          <div className="min-w-[9rem] flex-1 space-y-1.5">
            <Label htmlFor="to" className="text-xs text-muted-foreground">
              {t("reports.to")}
            </Label>
            <Input
              id="to"
              type="date"
              className="h-11 rounded-xl border-0 bg-card ring-1 ring-border text-base text-foreground"
              defaultValue={to}
              placeholder={t("reports.toPlaceholder")}
              onBlur={(e) =>
                setParams({
                  preset: "custom",
                  from,
                  to: e.target.value,
                })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
