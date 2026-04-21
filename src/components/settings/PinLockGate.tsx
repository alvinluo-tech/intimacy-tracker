"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useLockStore } from "@/stores/lock-store";
import { lockAppAction } from "@/features/privacy/actions";

// Threshold: Lock the app if it has been in the background for more than 1 minute
const BACKGROUND_LOCK_THRESHOLD_MS = 60 * 1000;

export function PinLockGate({
  requirePin,
  isUnlocked,
}: {
  requirePin: boolean;
  isUnlocked: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const lock = useLockStore((s) => s.lock);
  const hiddenTimeRef = useRef<number | null>(null);

  // 1. Core Gate Logic: Redirect to /lock if PIN is required but not unlocked
  useEffect(() => {
    if (!requirePin) return;
    if (isUnlocked) return;
    if (pathname === "/lock") return;
    const next = encodeURIComponent(pathname || "/dashboard");
    router.replace(`/lock?next=${next}`);
  }, [pathname, requirePin, router, isUnlocked]);

  // 2. Background Auto-Lock Logic: Listen to Page Visibility API
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
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [requirePin, isUnlocked, lock]);

  return null;
}
