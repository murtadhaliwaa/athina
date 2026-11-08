import { getItemsReport } from "@/actions/reports";
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
import { prisma } from "@/lib/prisma";
import { rangeFromSearchParams } from "@/lib/reports/parse-params";
import { t } from "@/lib/i18n/ar-iq";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function ItemsReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
    categoryId?: string;
  }>;
}) {
  const sp = await searchParams;
  const range = rangeFromSearchParams(sp);
  const rows = await getItemsReport({
    ...range,
    categoryId: sp.categoryId,
  });
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const qsBase = new URLSearchParams();
  if (sp.preset) qsBase.set("preset", sp.preset);
  if (sp.from) qsBase.set("from", sp.from);
  if (sp.to) qsBase.set("to", sp.to);

  const categoryToolbar = (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Link
        href={`/owner/reports/items?${qsBase.toString()}`}
        className={cn(
          "shrink-0 rounded-full px-3 py-2 text-sm",
          !sp.categoryId
            ? "bg-brand-amber font-medium text-black"
            : "border border-brand-gold/35 text-brand-gold",
        )}
      >
        {t("reports.allCategories")}
      </Link>
      {categories.map((c) => {
        const q = new URLSearchParams(qsBase);
        q.set("categoryId", c.id);
        return (
          <Link
            key={c.id}
            href={`/owner/reports/items?${q.toString()}`}
            className={cn(
              "shrink-0 rounded-full px-3 py-2 text-sm",
              sp.categoryId === c.id
                ? "bg-brand-amber font-medium text-black"
                : "border border-brand-gold/35 text-brand-gold",
            )}
          >
            {c.name}
          </Link>
        );
      })}
    </div>
  );

  return (
    <ReportSection
      title={t("reports.items")}
      empty={rows.length === 0}
      toolbar={categoryToolbar}
      export={
        <ReportExportButtons
          filename="items.csv"
          title={t("reports.items")}
          headers={[
            t("menu.categories"),
            t("menu.items"),
            t("reports.colQty"),
            t("reports.colRevenue"),
          ]}
          rows={rows.map((r) => [r.category, r.name, r.quantity, r.revenue])}
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("menu.categories")}</TableHead>
            <TableHead>{t("menu.items")}</TableHead>
            <TableHead>{t("reports.colQty")}</TableHead>
            <TableHead>{t("reports.colRevenue")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={`${r.category}-${r.name}`}>
              <TableCell>{r.category}</TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell>
                <bdi dir="ltr">{r.quantity}</bdi>
              </TableCell>
              <TableCell>
                <MoneyBdi amount={r.revenue} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportSection>
  );
}
