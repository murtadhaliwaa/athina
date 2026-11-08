import { getDailySalesReport } from "@/actions/reports";
import { ReportExportButtons } from "@/components/owner/reports/report-export-buttons";
import { ReportSection } from "@/components/owner/reports/report-section";
import { MoneyBdi } from "@/components/owner/reports/money-bdi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rangeFromSearchParams } from "@/lib/reports/parse-params";
import { formatBaghdadDate, formatBaghdadDayMonth } from "@/lib/time";
import { t } from "@/lib/i18n/ar-iq";

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const rows = await getDailySalesReport(rangeFromSearchParams(sp));

  const maxNet = Math.max(1, ...rows.map((r) => r.net));

  return (
    <ReportSection
      title={t("reports.salesDaily")}
      empty={rows.length === 0}
      export={
        <ReportExportButtons
          filename="daily-sales.csv"
          title={t("reports.salesDaily")}
          headers={[
            t("reports.colDate"),
            t("reports.colBillCount"),
            t("reports.colSubtotal"),
            t("reports.colDiscounts"),
            t("reports.colNet"),
          ]}
          rows={rows.map((r) => [
            r.date,
            r.billCount,
            r.subtotal,
            r.discounts,
            r.net,
          ])}
        />
      }
    >
      {rows.length > 0 ? (
        <div className="mb-4 flex h-40 items-end gap-1.5 rounded-xl border border-border bg-card px-2 pt-3 pb-2">
          {rows.map((r) => {
            const barPx = Math.max(4, Math.round((r.net / maxNet) * 112));
            return (
              <div
                key={r.date}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                title={`${formatBaghdadDate(r.date)} — ${r.net}`}
              >
                <div
                  className="bg-brand-amber w-full max-w-8 rounded-t-md"
                  style={{ height: `${barPx}px` }}
                />
                <span className="text-[9px] leading-none text-muted-foreground">
                  {formatBaghdadDayMonth(r.date)}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.colDate")}</TableHead>
            <TableHead>{t("reports.colBillCount")}</TableHead>
            <TableHead>{t("reports.colSubtotal")}</TableHead>
            <TableHead>{t("reports.colDiscounts")}</TableHead>
            <TableHead>{t("reports.colNet")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.date}>
              <TableCell>{formatBaghdadDate(r.date)}</TableCell>
              <TableCell>
                <bdi dir="ltr">{r.billCount}</bdi>
              </TableCell>
              <TableCell>
                <MoneyBdi amount={r.subtotal} />
              </TableCell>
              <TableCell>
                <MoneyBdi amount={r.discounts} />
              </TableCell>
              <TableCell>
                <MoneyBdi amount={r.net} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportSection>
  );
}
