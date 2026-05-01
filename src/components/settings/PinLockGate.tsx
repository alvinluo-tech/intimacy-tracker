"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { useLockStore } from "@/stores/lock-store";
import { lockAppAction } from "@/features/privacy/actions";

// Threshold: Lock the app if it has been in the background for more than 1 minute
const BACKGROUND_LOCK_THRESHOLD_MS = 0;

export function PinLockGate({
  requirePin,
  isUnlocked,
}: {
  requirePin: boolean;
  isUnlocked: boolean;
}) {
  const pathname = usePathname();
  const lock = useLockStore((s) => s.lock);
  const hiddenTimeRef = useRef<number | null>(null);

  // 1. Core Gate Logic: Redirect to /lock if PIN is required but not unlocked
  //    Uses window.location for reliable redirect on mobile (router.replace can silently fail)
  useEffect(() => {
    if (!requirePin) return;
    if (isUnlocked) return;
    if (pathname === "/lock") return;
    const next = encodeURIComponent(pathname || "/dashboard");
    const target = `/lock?next=${next}`;
    // Avoid redirect loop: only redirect if not already on the target
    if (window.location.pathname + window.location.search !== target) {
      window.location.replace(target);
    }
  }, [pathname, requirePin, isUnlocked]);

  // 2. Cold-Start Detection: Check localStorage on mount (survives PWA kill)
  useEffect(() => {
    if (!requirePin || !isUnlocked) return;
    try {
      const lastActive = parseInt(localStorage.getItem("pin_last_active") ?? "0", 10);
      if (lastActive > 0 && Date.now() - lastActive > BACKGROUND_LOCK_THRESHOLD_MS) {
        lock();
        lockAppAction().catch(console.error);
      }
    } catch { /* localStorage unavailable */ }
    try {
      localStorage.setItem("pin_last_active", String(Date.now()));
    } catch { /* ignore */ }
  }, []);

  // 3. Background Auto-Lock Logic: Listen to Page Visibility API
  useEffect(() => {
    if (!requirePin || !isUnlocked) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // App goes to background: record timestamp
        hiddenTimeRef.current = Date.now();
      } else if (document.visibilityState === "visible") {
        // App comes to foreground: check elapsed time
        if (hiddenTimeRef.current) {
          const timeHidden = Date.now() - hiddenTimeRef.current;
          if (timeHidden > BACKGROUND_LOCK_THRESHOLD_MS) {
            // Time exceeded threshold, trigger lock!
            lock(); // 1. Sync client state immediately (triggers the first useEffect to redirect)
            lockAppAction().catch(console.error); // 2. Clear server cookie in background
          }
          hiddenTimeRef.current = null; // Reset
        }
        // Persist last-active timestamp for cold-start detection
        try {
          localStorage.setItem("pin_last_active", String(Date.now()));
        } catch { /* ignore */ }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [requirePin, isUnlocked, lock]);

  return null;
}
