"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, X } from "lucide-react";

const STORAGE_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function wasRecentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function markDismissed(): void {
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | null>(null);

  useEffect(() => {
    // Skip if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Skip if recently dismissed
    if (wasRecentlyDismissed()) return;

    // Detect platform
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
      setPlatform("ios");
      // iOS doesn't fire beforeinstallprompt; show manual instructions
      setVisible(true);
    } else {
      setPlatform(/Android/.test(ua) ? "android" : "desktop");
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Also show if the app was installed but we missed the event
    const timeout = setTimeout(() => {
      if (!deferredPrompt && !visible && platform !== "ios") {
        // Already captured or dismissed
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstall = useCallback(async () => {
    if (platform === "ios") {
      // iOS: can't trigger programmatic install; show was dismissed
      markDismissed();
      setVisible(false);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      } else {
        markDismissed();
        setVisible(false);
      }
    } catch {
      markDismissed();
      setVisible(false);
    }

    setDeferredPrompt(null);
  }, [deferredPrompt, platform]);

  const handleDismiss = useCallback(() => {
    markDismissed();
    setVisible(false);
  }, []);

  if (!visible || !platform) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-2xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <img
            src="/icon-48.png"
            alt=""
            className="mt-0.5 h-10 w-10 rounded-xl"
            aria-hidden
          />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-content">
              {platform === "ios"
                ? "Install Encounter"
                : "Add to Home Screen"}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
              {platform === "ios"
                ? "Tap Share then Add to Home Screen for the best experience."
                : "Get quick access and offline support — no app store needed."}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-content transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          onClick={handleInstall}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          <Download className="h-4 w-4" />
          {platform === "ios" ? "Got it" : "Install"}
        </button>
      </div>
    </div>
  );
}
