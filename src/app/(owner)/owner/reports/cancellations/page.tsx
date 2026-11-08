import { getCancellationsReport } from "@/actions/reports";
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
import { formatBaghdadDateTime } from "@/lib/format-datetime";
import { rangeFromSearchParams } from "@/lib/reports/parse-params";
import { t } from "@/lib/i18n/ar-iq";

export default async function CancellationsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const rows = await getCancellationsReport(rangeFromSearchParams(sp));

  return (
    <ReportSection
      title={t("reports.cancellations")}
      empty={rows.length === 0}
      export={
        <ReportExportButtons
          filename="cancellations.csv"
          title={t("reports.cancellations")}
          headers={[
            t("reports.colKind"),
            t("reports.colDetail"),
            t("reports.colValue"),
            t("audit.actor"),
            t("audit.reason"),
            t("audit.time"),
          ]}
          rows={rows.map((r) => [
            r.kind === "order" ? t("reports.kindOrder") : t("reports.kindItem"),
            r.label,
            r.value,
            r.by ?? "",
            r.reason ?? "",
            r.at ? formatBaghdadDateTime(r.at) : "",
          ])}
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.colKind")}</TableHead>
            <TableHead>{t("reports.colDetail")}</TableHead>
            <TableHead>{t("reports.colValue")}</TableHead>
            <TableHead>{t("audit.actor")}</TableHead>
            <TableHead>{t("audit.reason")}</TableHead>
            <TableHead>{t("audit.time")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={`${r.kind}-${i}`}>
              <TableCell>
                {r.kind === "order"
                  ? t("reports.kindOrder")
                  : t("reports.kindItem")}
              </TableCell>
              <TableCell>{r.label}</TableCell>
              <TableCell>
                {r.value > 0 ? <MoneyBdi amount={r.value} /> : "—"}
              </TableCell>
              <TableCell>{r.by ?? "—"}</TableCell>
              <TableCell className="max-w-[10rem] truncate">
                {r.reason ?? "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {r.at ? formatBaghdadDateTime(r.at) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportSection>
  );
}
