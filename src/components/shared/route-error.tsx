"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/ar-iq";

export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-destructive text-lg font-medium">{t("error.generic")}</p>
      <Button type="button" className="h-11" onClick={reset}>
        {t("error.retry")}
      </Button>
    </div>
  );
}
