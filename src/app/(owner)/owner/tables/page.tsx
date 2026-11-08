import { TablesPanel } from "@/components/owner/tables-panel";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n/ar-iq";

export default async function OwnerTablesPage() {
  const tables = await prisma.cafeTable.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <PageHeader title={t("tables.manage")} />
      <TablesPanel tables={tables} />
    </div>
  );
}
