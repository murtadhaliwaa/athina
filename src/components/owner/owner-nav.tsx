"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Coffee,
  LayoutGrid,
  Wallet,
} from "lucide-react";
import { OwnerMoreSheet } from "@/components/owner/owner-more-sheet";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

/** أهم ٥ للوصول السريع — الباقي في المزيد */
const links = [
  {
    href: "/owner",
    label: t("nav.home"),
    icon: LayoutGrid,
    match: (path: string) => path === "/owner",
  },
  {
    href: "/owner/expenses",
    label: t("nav.expenses"),
    icon: Wallet,
    match: (path: string) => path.startsWith("/owner/expenses"),
  },
  {
    href: "/owner/reports/sales",
    label: t("nav.reports"),
    icon: BarChart3,
    match: (path: string) => path.startsWith("/owner/reports"),
  },
  {
    href: "/owner/menu",
    label: t("nav.menu"),
    icon: Coffee,
    match: (path: string) => path.startsWith("/owner/menu"),
  },
];

export function OwnerNav() {
  const pathname = usePathname();
  const moreActive =
    pathname.startsWith("/owner/offers") ||
    pathname.startsWith("/owner/staff") ||
    pathname.startsWith("/owner/tables") ||
    pathname.startsWith("/owner/settings") ||
    pathname.startsWith("/owner/audit");

  return (
    <nav className="border-border bg-background fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex w-full max-w-5xl">
        {links.map((l) => {
          const active = l.match(pathname);
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
                active ? "text-brand-amber" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {l.label}
            </Link>
          );
        })}
        <OwnerMoreSheet active={moreActive} />
      </div>
    </nav>
  );
}
