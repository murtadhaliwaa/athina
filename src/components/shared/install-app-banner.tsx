"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/ar-iq";

const DISMISS_KEY = "cafe_pwa_install_dismissed_v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return true;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const ios =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || ios;
}

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notOther = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && notOther;
}

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

type Mode = "hidden" | "ios" | "android";

/** يظهر على شاشة الدخول فقط — لا يغطّي شريط الويتر/الكاشير أثناء الخدمة */
export function InstallAppBanner() {
  const [mode, setMode] = useState<Mode>("hidden");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (isStandalone() || !isMobileViewport() || readDismissed()) return;

    if (isIosSafari()) {
      // مؤجّل لإطار الرسم التالي — يتجنّب setState متزامن مع تركيب الأثر
      const id = window.setTimeout(() => setMode("ios"), 0);
      return () => window.clearTimeout(id);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("android");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);

    const fallback = window.setTimeout(() => {
      setMode((m) => (m === "hidden" ? "android" : m));
    }, 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.clearTimeout(fallback);
    };
  }, []);

  const dismiss = useCallback(() => {
    setMode("hidden");
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* تجاهل */
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* تجاهل */
    }
    setDeferred(null);
    dismiss();
  }, [deferred, dismiss]);

  if (mode === "hidden") return null;

  const ios = mode === "ios";
  const hint = ios
    ? t("pwa.iosHint")
    : deferred
      ? t("pwa.body")
      : t("pwa.browserHint");

  return (
    <div
      role="dialog"
      aria-label={t("pwa.title")}
      className="border-border bg-card/95 fixed inset-x-3 z-40 rounded-2xl border p-3 shadow-lg backdrop-blur-md sm:inset-x-auto sm:start-4 sm:max-w-sm"
      style={{
        bottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="bg-brand-amber/20 text-brand-amber flex size-11 shrink-0 items-center justify-center rounded-xl">
          <Download className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold leading-snug">{t("pwa.title")}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>
          {!ios && deferred ? (
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                className="h-11 flex-1 rounded-xl bg-brand-amber font-semibold text-black hover:bg-brand-amber/90"
                onClick={() => void install()}
              >
                {t("pwa.install")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl px-4"
                onClick={dismiss}
              >
                {t("pwa.later")}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="ghost"
                className="h-11 px-4 text-sm"
                onClick={dismiss}
              >
                {t("pwa.later")}
              </Button>
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label={t("pwa.later")}
          onClick={dismiss}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
