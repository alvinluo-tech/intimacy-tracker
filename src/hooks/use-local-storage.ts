"use client";

import { useSyncExternalStore } from "react";

const CHANGE_EVENT = "local-storage-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
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
 * Updates when localStorage changes in another tab (storage event) or in the
 * same tab (via writeLocalStorage).
 */
export function useLocalStorage(key: string): string | null {
  return useSyncExternalStore(subscribe, () => getSnapshot(key), getServerSnapshot);
}

/**
 * Writes localStorage and notifies same-tab useLocalStorage subscribers —
 * the browser only fires `storage` events in OTHER tabs.
 */
export function writeLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
  } catch {
    // storage unavailable (private mode etc.) — ignore
  }
}
