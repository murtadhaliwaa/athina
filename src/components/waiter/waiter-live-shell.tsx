"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  fetchWaiterReadyOrders,
  type ReadyOrderBrief,
} from "@/actions/waiter-ready";
import { ReadyNotifier } from "@/components/waiter/ready-notifier";
import { WaiterBottomNav } from "@/components/waiter/bottom-nav";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { t } from "@/lib/i18n/ar-iq";

/**
 * يعيش فوق صفحات الويتر: يحدّث «جاهز» بإجراء خفيف فقط —
 * بدون router.refresh() الذي كان يقطع بث RSC ويظهر stream error.
 */
export function WaiterLiveShell({
  children,
  shiftOpen,
  initialMine,
  initialReadyCount,
}: {
  children: React.ReactNode;
  shiftOpen: boolean;
  initialMine: ReadyOrderBrief[];
  initialReadyCount: number;
}) {
  const [mine, setMine] = useState(initialMine);
  const [readyCount, setReadyCount] = useState(initialReadyCount);
  const [navPending, setNavPending] = useState(false);
  const [, startTransition] = useTransition();
  const inflight = useRef(false);

  const onNavigating = useCallback((pending: boolean) => {
    setNavPending(pending);
  }, []);

  const syncReady = useCallback(() => {
    if (inflight.current) return;
    inflight.current = true;
    startTransition(async () => {
      try {
        const res = await fetchWaiterReadyOrders();
        if (!res.ok) return;
        setMine(res.mine);
        setReadyCount(res.total);
      } finally {
        inflight.current = false;
      }
    });
  }, []);

  // أول مزامنة بعد الدخول — بدون استعلام ثقيل في layout
  useEffect(() => {
    syncReady();
  }, [syncReady]);

  // orders فقط — تغيّر الحالة إلى READY؛ لا نعيد تحميل الصفحة عند كل صنف
  useRealtimeRefresh(["orders"], syncReady, {
    debounceMs: 500,
    backupMs: 90_000,
  });

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-background pb-[calc(5rem+env(safe-area-inset-bottom))]">
      {!shiftOpen && (
        <p className="bg-destructive/10 text-destructive px-4 py-2 text-center text-sm">
          {t("shift.closed")}
        </p>
      )}
      <ReadyNotifier readyOrders={mine} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        {children}
        {navPending ? (
          <div
            className="bg-background/75 absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]"
            role="status"
            aria-live="polite"
            aria-label={t("app.loading")}
          >
            <Loader2
              className="text-brand-amber size-8 animate-spin"
              aria-hidden
            />
            <p className="text-muted-foreground text-sm">{t("app.loading")}</p>
          </div>
        ) : null}
      </div>
      <WaiterBottomNav readyCount={readyCount} onNavigating={onNavigating} />
    </div>
  );
}
