"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/use-sound";
import { t } from "@/lib/i18n/ar-iq";

export function ReadyNotifier({
  readyOrders,
}: {
  readyOrders: { id: string; tableLabel: string | null }[];
}) {
  const seen = useRef(new Set<string>());
  const primed = useRef(false);
  const { play, unlocked, enable } = useSound("/sounds/new-order.wav");

  useEffect(() => {
    if (!primed.current) {
      for (const o of readyOrders) seen.current.add(o.id);
      primed.current = true;
      return;
    }
    for (const o of readyOrders) {
      if (seen.current.has(o.id)) continue;
      seen.current.add(o.id);
      play();
      toast.success(
        t("notify.orderReady", {
          table: o.tableLabel ?? t("tables.unlabeled"),
        }),
        {
          duration: Infinity,
          closeButton: true,
        },
      );
    }
  }, [readyOrders, play]);

  if (unlocked) return null;

  return (
    <div className="px-4 pb-1">
      <Button
        type="button"
        variant="secondary"
        className="h-11 w-full rounded-xl border border-brand-gold/50 text-sm font-medium text-brand-amber"
        onClick={() => enable()}
      >
        {t("sound.enable")}
      </Button>
    </div>
  );
}
