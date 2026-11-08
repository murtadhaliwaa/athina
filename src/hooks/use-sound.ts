"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const UNLOCK_KEY = "cafe_sound_unlocked";

/**
 * صوت الإشعارات.
 * المتصفح يمنع التشغيل بلا تفاعل — نفتح الصوت عند أول لمسة/زر،
 * ونشغّل دائماً على نفس عنصر Audio (مطلوب لـ iOS).
 */
export function useSound(src = "/sounds/new-order.wav") {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const [unlocked, setUnlocked] = useState(false);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio(src);
      a.preload = "auto";
      a.setAttribute("playsinline", "true");
      audioRef.current = a;
    }
    return audioRef.current;
  }, [src]);

  const playNow = useCallback(async () => {
    const a = ensureAudio();
    a.volume = 1;
    a.currentTime = 0;
    await a.play();
  }, [ensureAudio]);

  const markUnlocked = useCallback(() => {
    unlockedRef.current = true;
    setUnlocked(true);
    try {
      sessionStorage.setItem(UNLOCK_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const unlock = useCallback(() => {
    if (unlockedRef.current) {
      if (pendingPlayRef.current) {
        pendingPlayRef.current = false;
        void playNow().catch(() => {
          pendingPlayRef.current = true;
          unlockedRef.current = false;
          setUnlocked(false);
        });
      }
      return;
    }

    const audio = ensureAudio();
    const wasMuted = audio.muted;
    audio.muted = true;
    const p = audio.play();
    if (!p) return;

    void p
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = wasMuted;
        markUnlocked();
        if (pendingPlayRef.current) {
          pendingPlayRef.current = false;
          void playNow().catch(() => {
            pendingPlayRef.current = true;
            unlockedRef.current = false;
            setUnlocked(false);
          });
        }
      })
      .catch(() => {
        audio.muted = wasMuted;
      });
  }, [ensureAudio, playNow, markUnlocked]);

  useEffect(() => {
    const onInteract = () => unlock();
    document.addEventListener("pointerdown", onInteract, { passive: true });
    document.addEventListener("keydown", onInteract);
    document.addEventListener("touchstart", onInteract, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onInteract);
      document.removeEventListener("keydown", onInteract);
      document.removeEventListener("touchstart", onInteract);
    };
  }, [unlock]);

  const play = useCallback(() => {
    ensureAudio();
    if (!unlockedRef.current) {
      pendingPlayRef.current = true;
      try {
        if (sessionStorage.getItem(UNLOCK_KEY) === "1") {
          unlockedRef.current = true;
          setUnlocked(true);
          pendingPlayRef.current = false;
          void playNow().catch(() => {
            pendingPlayRef.current = true;
            unlockedRef.current = false;
            setUnlocked(false);
            try {
              sessionStorage.removeItem(UNLOCK_KEY);
            } catch {
              /* ignore */
            }
          });
          return;
        }
      } catch {
        /* ignore */
      }
      return;
    }

    void playNow().catch(() => {
      pendingPlayRef.current = true;
      unlockedRef.current = false;
      setUnlocked(false);
      try {
        sessionStorage.removeItem(UNLOCK_KEY);
      } catch {
        /* ignore */
      }
    });
  }, [ensureAudio, playNow]);

  return {
    play,
    unlocked,
    enabled: unlocked,
    enable: unlock,
  };
}
