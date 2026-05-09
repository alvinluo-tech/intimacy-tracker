"use client";

import { useCallback } from "react";

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

export function useWebShare() {
  const share = useCallback(async (data: ShareData) => {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return { ok: true as const };
      } catch (err) {
        const error = err as DOMException;
        if (error.name === "AbortError") {
          return { ok: false as const, reason: "cancelled" as const };
        }
        return { ok: false as const, reason: "error" as const, message: error.message };
      }
    }

    // Fallback: copy to clipboard
    const text = [data.title, data.text, data.url].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true as const, fallback: "clipboard" as const };
    } catch {
      return { ok: false as const, reason: "unsupported" as const };
    }
  }, []);

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return { share, canShare };
}
