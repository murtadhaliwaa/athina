"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/theme-provider";
import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/ar-iq";

function subscribeEmpty() {
  return () => undefined;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeEmpty,
    () => true,
    () => false,
  );

  // قبل التحميل: نفس الشكل على السيرفر والعميل لتفادي hydration mismatch
  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={`h-11 w-11 shrink-0 ${className ?? ""}`}
        aria-label={t("theme.toggle")}
        disabled
      >
        <SunIcon className="size-5 opacity-50" />
      </Button>
    );
  }

  // إذا بقي "system" من إعداد قديم → نعتمد الوضع المحلول
  const isDark =
    theme === "dark" || (theme !== "light" && resolvedTheme === "dark");
  const next = isDark ? "light" : "dark";
  const label = isDark ? t("theme.dark") : t("theme.light");
  const Icon = isDark ? MoonIcon : SunIcon;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={`h-11 w-11 shrink-0 ${className ?? ""}`}
      aria-label={label}
      onClick={() => setTheme(next)}
    >
      <Icon className="size-5" />
    </Button>
  );
}
