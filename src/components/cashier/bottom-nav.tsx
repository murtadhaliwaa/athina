"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FileText, Wallet, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/ar-iq";

const links = [
  { href: "/cashier", label: t("cashier.board"), icon: ClipboardList, exact: true },
  { href: "/cashier/bills", label: t("nav.bills"), icon: FileText },
  { href: "/cashier/shift", label: t("nav.shift"), icon: Wallet },
  { href: "/cashier/history", label: t("cashier.history"), icon: History },
];

export function CashierBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="border-border bg-background fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex w-full max-w-5xl">
        {links.map((l) => {
          const active = l.exact
            ? pathname === l.href
            : pathname.startsWith(l.href);
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
      </div>
    </nav>
  );
}
