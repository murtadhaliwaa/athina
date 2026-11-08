"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_DEBOUNCE_MS = 400;
/** شبكة أمان خفيفة — لا تقطع تحميل الصفحات البطيئة */
const DEFAULT_BACKUP_MS = 60_000;

export type RealtimeRefreshOptions = {
  debounceMs?: number;
  backupMs?: number;
};

/**
 * إشارة Realtime ثم إعادة جلب مركّزة (debounce).
 * Backup أطول عمداً حتى لا يقطع بث RSC أثناء التنقل.
 */
export function useRealtimeRefresh(
  tables: string[],
  onChange: () => void,
  options?: RealtimeRefreshOptions,
): void {
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tablesKey = tables.join(",");
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const backupMs = options?.backupMs ?? DEFAULT_BACKUP_MS;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const supabase = createClient();
    const tableList = tablesKey.split(",").filter(Boolean);
    let channel = supabase.channel(`cafe-live-${tablesKey}`);
    let inflight = false;
    let inflightReset: ReturnType<typeof setTimeout> | null = null;

    const fire = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        // منع refresh متزامن يقطع بث RSC
        if (inflight) return;
        if (document.visibilityState !== "visible") return;
        inflight = true;
        try {
          onChangeRef.current();
        } finally {
          if (inflightReset) clearTimeout(inflightReset);
          inflightReset = setTimeout(() => {
            inflight = false;
            inflightReset = null;
          }, Math.max(debounceMs, 1200));
        }
      }, debounceMs);
    };

    for (const table of tableList) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => fire(),
      );
    }

    channel.subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") fire();
    };
    document.addEventListener("visibilitychange", onVisible);

    const backup = window.setInterval(() => {
      if (document.visibilityState === "visible") fire();
    }, backupMs);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(backup);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (inflightReset) clearTimeout(inflightReset);
      void supabase.removeChannel(channel);
    };
  }, [tablesKey, debounceMs, backupMs]);
}
