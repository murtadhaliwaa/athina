"use client";

import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  PageHeaderTitleBlock,
  usePageHeaderActionsSlot,
  usePageHeaderContent,
} from "@/components/shared/page-header";
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
  canNavigateBack,
  fallbackBackHref,
  isPrimaryNavPath,
  recordNavPath,
} from "@/lib/nav-history";
import { t } from "@/lib/i18n/ar-iq";
import { cn } from "@/lib/utils";

function useFullUrl() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function NavHistoryTracker() {
  const url = useFullUrl();
  useEffect(() => {
    recordNavPath(url);
  }, [url]);
  return null;
}

function HeaderBack({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="bg-muted text-foreground inline-flex size-11 shrink-0 items-center justify-center rounded-2xl"
      aria-label={t("app.back")}
      title={t("app.back")}
      onClick={() => {
        if (canNavigateBack()) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
    >
      <ChevronRight className="size-5" aria-hidden />
    </button>
  );
}

function HeaderLogout() {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <button
            type="button"
            className="bg-muted text-foreground inline-flex size-11 shrink-0 items-center justify-center rounded-2xl"
            aria-label={t("auth.logout")}
            title={t("auth.logout")}
          >
            <LogOut className="size-5" aria-hidden />
          </button>
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
  );
}

function HeaderActionsSlot() {
  const setActionsEl = usePageHeaderActionsSlot();
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!setActionsEl) return;
    setActionsEl(ref.current);
    return () => setActionsEl(null);
  }, [setActionsEl]);
  return (
    <div ref={ref} className="flex items-center gap-2 empty:hidden" />
  );
}

function HeaderBar({
  showBack,
  fallbackHref,
}: {
  showBack: boolean;
  fallbackHref: string;
}) {
  const content = usePageHeaderContent();

  return (
    <div
      className={cn(
        "bg-background sticky top-0 z-40 flex min-h-14 shrink-0 items-start gap-3 px-4 py-3",
      )}
    >
      {showBack ? <HeaderBack fallbackHref={fallbackHref} /> : null}
      {content ? (
        <PageHeaderTitleBlock content={content} className="flex-1 pt-0.5" />
      ) : (
        <div className="min-w-0 flex-1" aria-hidden />
      )}
      <div className="flex shrink-0 items-center gap-2">
        <HeaderActionsSlot />
        <ThemeToggle className="rounded-2xl border-0 bg-muted" />
        <HeaderLogout />
      </div>
    </div>
  );
}

function AppHeaderActionsBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showBack = !isPrimaryNavPath(pathname);
  const fallbackHref = fallbackBackHref(pathname, searchParams.get("table"));

  return (
    <>
      <NavHistoryTracker />
      <HeaderBar showBack={showBack} fallbackHref={fallbackHref} />
    </>
  );
}

/** شريط علوي: العنوان والأزرار في صف واحد من الأعلى — بلا تراكب */
export function AppHeaderActionsBar() {
  return (
    <Suspense
      fallback={<HeaderBar showBack={false} fallbackHref="/" />}
    >
      <AppHeaderActionsBarInner />
    </Suspense>
  );
}
