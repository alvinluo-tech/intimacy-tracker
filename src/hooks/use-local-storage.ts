"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

/**
 * Safe localStorage reader that works with SSR.
 * Returns null during SSR and on client after hydration.
 * Updates when localStorage changes (via storage event or manual setItem).
 */
export function useLocalStorage(key: string): string | null {
  return useSyncExternalStore(subscribe, () => getSnapshot(key), getServerSnapshot);
}
