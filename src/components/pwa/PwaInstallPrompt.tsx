"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// ---- Public helpers (can be called from anywhere) ----

export function isPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function wasRecentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function clearInstallDismissal(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function markDismissed(): void {
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
}

// ---- Component ----

export function PwaInstallPrompt() {
  const t = useTranslations("pwa");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | null>(null);
  // Track whether user dismissed once before → show different CTA on retry
  const [wasDismissed, setWasDismissed] = useState(false);

  useEffect(() => {
    if (isPwaInstalled()) return;

    const wasPrevDismissed = wasRecentlyDismissed();
    setWasDismissed(wasPrevDismissed);

    if (wasPrevDismissed) return;

    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
      setPlatform("ios");
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

    // Allow external force-show via custom event
    const forceHandler = () => {
      if (isPwaInstalled()) return;
      setPlatform((prev) => {
        if (prev) return prev;
        const ua = navigator.userAgent;
        if (/iPhone|iPad|iPod/.test(ua)) return "ios";
        return /Android/.test(ua) ? "android" : "desktop";
      });
      setWasDismissed(false);
      setVisible(true);
    };
    window.addEventListener("pwa-force-install-prompt", forceHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("pwa-force-install-prompt", forceHandler);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInstall = useCallback(async () => {
    if (platform === "ios") {
      try {
        await navigator.share({
          title: "Encounter",
          text: "Private intimacy tracker",
          url: window.location.origin,
        });
      } catch {
        // User cancelled or share not supported
      }
      markDismissed();
      setVisible(false);
      return;
    }

    if (!deferredPrompt) {
      // Event already consumed (user dismissed native dialog earlier).
      // Reload the page to get a fresh beforeinstallprompt event.
      // The prompt will show automatically on reload since dismissal was cleared.
      window.location.reload();
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      } else {
        markDismissed();
        setVisible(false);
        setWasDismissed(true);
      }
    } catch {
      markDismissed();
      setVisible(false);
      setWasDismissed(true);
    }

    setDeferredPrompt(null);
  }, [deferredPrompt, platform]);

  const handleDismiss = useCallback(() => {
    markDismissed();
    setVisible(false);
    setWasDismissed(true);
  }, []);

  if (!visible || !platform) return null;

  const needsRefresh = !deferredPrompt && platform !== "ios";

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
              {platform === "ios" ? t("iosTitle") : t("title")}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
              {platform === "ios"
                ? t("iosDescription")
                : needsRefresh
                  ? t("refreshDescription")
                  : t("description")}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-content transition-colors"
            aria-label={t("dismiss")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          onClick={handleInstall}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          {needsRefresh ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {needsRefresh
            ? t("refreshButton")
            : platform === "ios"
              ? t("iosButton")
              : t("button")}
        </button>
      </div>
    </div>
  );
}
