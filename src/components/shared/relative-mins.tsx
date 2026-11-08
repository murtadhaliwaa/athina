"use client";

import { useEffect, useState } from "react";
import { formatMinsAgo, formatMinsShort } from "@/lib/format-datetime";
import { t } from "@/lib/i18n/ar-iq";
import { cn } from "@/lib/utils";

/**
 * وقت نسبي بعد التركيب فقط — يمنع اختلاف hydration بين السيرفر والعميل.
 */
export function RelativeMins({
  iso,
  className,
  mode = "short",
}: {
  iso: string;
  className?: string;
  mode?: "short" | "openDuration" | "ago";
}) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const date = new Date(iso);
      const mins = Math.max(
        1,
        Math.floor((Date.now() - date.getTime()) / 60_000),
      );
      if (mode === "openDuration") {
        setLabel(t("bill.openDuration", { n: mins }));
      } else if (mode === "ago") {
        setLabel(formatMinsAgo(date));
      } else {
        setLabel(formatMinsShort(date));
      }
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [iso, mode]);

  if (!label) {
    return (
      <span className={cn(className, "invisible")} aria-hidden>
        —
      </span>
    );
  }

  return <span className={className}>{label}</span>;
}
