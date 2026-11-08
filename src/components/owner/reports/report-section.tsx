import type { ReactNode } from "react";
import { t } from "@/lib/i18n/ar-iq";

export function ReportSection({
  title,
  empty,
  export: exportBtn,
  toolbar,
  children,
}: {
  title: string;
  empty: boolean;
  export?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      {toolbar}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {exportBtn}
      </div>
      {empty ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {t("reports.empty")}
        </p>
      ) : (
        <div
          className={
            "overflow-x-auto rounded-2xl border border-border bg-card " +
            "[&_th]:h-11 [&_th]:px-3 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground " +
            "[&_td]:px-3 [&_td]:py-3 [&_td]:text-sm [&_td]:text-foreground " +
            "[&_tr]:border-brand-gold/10 [&_tr:hover]:bg-brand-gold/5"
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}
