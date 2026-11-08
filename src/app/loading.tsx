import { t } from "@/lib/i18n/ar-iq";

export default function RootLoading() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-3 bg-background px-4">
      <div className="border-brand-gold/40 size-11 animate-pulse rounded-full border-2" />
      <p className="text-muted-foreground text-sm">{t("app.loading")}</p>
    </div>
  );
}
