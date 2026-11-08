"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

const links = [
  { href: "/owner/reports/sales", label: t("reports.salesDaily") },
  { href: "/owner/reports/waiters", label: t("reports.salesWaiters") },
  { href: "/owner/reports/items", label: t("reports.items") },
  { href: "/owner/reports/discounts", label: t("reports.discounts") },
  { href: "/owner/reports/cancellations", label: t("reports.cancellations") },
  { href: "/owner/reports/shifts", label: t("reports.shifts") },
  { href: "/owner/reports/voided", label: t("reports.voided") },
];

export function ReportsSubnav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";

  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={`${l.href}${suffix}`}
            className={cn(
              "shrink-0 rounded-full px-4 py-2.5 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-brand-amber font-medium text-black"
                : "border border-brand-gold/35 text-brand-gold",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
