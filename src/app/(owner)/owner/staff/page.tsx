import { StaffPanel } from "@/components/owner/staff-panel";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n/ar-iq";

export default async function OwnerStaffPage() {
  const staff = await prisma.profile.findMany({
    where: { role: { not: "OWNER" } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader title={t("staff.title")} />
      <StaffPanel staff={staff} />
    </div>
  );
}
