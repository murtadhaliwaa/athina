import { SettingsForm } from "@/components/owner/settings-form";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n/ar-iq";

export default async function OwnerSettingsPage() {
  const settings = await prisma.cafeSettings.findUniqueOrThrow({
    where: { id: 1 },
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-4 pt-3">
      <PageHeader title={t("settings.title")} />
      <SettingsForm settings={settings} />
    </div>
  );
}
