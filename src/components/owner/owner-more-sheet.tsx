"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { logout } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { t } from "@/lib/i18n/ar-iq";

const links = [
  { href: "/owner/tables", label: t("nav.tables") },
  { href: "/owner/settings", label: t("nav.settings") },
  { href: "/owner/audit", label: t("nav.audit") },
];

export function OwnerMoreSheet({ active = false }: { active?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [pathBaseline, setPathBaseline] = useState(pathname);
  if (pathname !== pathBaseline) {
    setPathBaseline(pathname);
    if (open) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={
          active
            ? "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-brand-amber"
            : "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground"
        }
        aria-label={t("nav.more")}
      >
        <MoreHorizontal className="size-5" />
        {t("nav.more")}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="gap-2 rounded-t-2xl border-border bg-card pb-[env(safe-area-inset-bottom)] text-foreground"
      >
        <SheetHeader>
          <SheetTitle>{t("nav.more")}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-2 pb-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="hover:bg-muted rounded-xl px-4 py-3 text-sm font-medium"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <span className="text-sm">{t("theme.toggle")}</span>
            <ThemeToggle />
          </div>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="mt-1 h-11 w-full"
                >
                  {t("auth.logout")}
                </Button>
              }
            />
            <AlertDialogContent size="sm">
              <AlertDialogHeader className="place-items-center text-center">
                <AlertDialogMedia className="mb-1 size-12 rounded-2xl bg-brand-amber/15 text-brand-amber">
                  <LogOut className="size-6" aria-hidden />
                </AlertDialogMedia>
                <AlertDialogTitle className="text-lg font-semibold">
                  {t("auth.logoutConfirm")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("auth.logoutHint")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="grid grid-cols-2">
                <AlertDialogCancel className="h-11 w-full rounded-xl">
                  {t("confirm.no")}
                </AlertDialogCancel>
                <form action={logout} className="contents">
                  <AlertDialogAction
                    type="submit"
                    className="h-11 w-full rounded-xl bg-brand-amber font-semibold text-black hover:bg-brand-amber/90"
                  >
                    {t("confirm.yes")}
                  </AlertDialogAction>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
