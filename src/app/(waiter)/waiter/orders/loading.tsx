import { Loader2 } from "lucide-react";
import { t } from "@/lib/i18n/ar-iq";

export default function WaiterOrdersLoading() {
  return (
    <div
      className="flex min-h-[50dvh] flex-1 flex-col items-center justify-center gap-3 p-6"
      role="status"
      aria-live="polite"
      aria-label={t("app.loading")}
    >
      <Loader2 className="text-brand-amber size-8 animate-spin" aria-hidden />
      <p className="text-muted-foreground text-sm">{t("app.loading")}</p>
      <div className="mt-4 w-full max-w-md space-y-3 opacity-40">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-muted h-24 w-full animate-pulse rounded-2xl" />
        ))}
      </div>
    </div>
  );
}