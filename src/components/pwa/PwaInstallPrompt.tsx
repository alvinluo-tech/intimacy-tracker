"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// ---- Public ----

export function isPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

function markDismissed(): void {
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
}

export function clearInstallDismissal(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function triggerInstallPrompt(): void {
  if (typeof window === "undefined") return;
  clearInstallDismissal();
  window.dispatchEvent(new Event("pwa-show-install"));
}

// ---- Component ----

export function PwaInstallPrompt() {
  const t = useTranslations("pwa");
  const [forceVisible, setForceVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | null>(null);
  const platformRef = useRef(platform);
  platformRef.current = platform; // keep in sync for always-on listener

  // Always listen for force-show event (never skipped)
  useEffect(() => {
    if (isPwaInstalled()) return;

    const onForce = () => {
      if (isPwaInstalled()) return;
      if (!platformRef.current) {
        const ua = navigator.userAgent;
        if (/iPhone|iPad|iPod/.test(ua)) setPlatform("ios");
        else setPlatform(/Android/.test(ua) ? "android" : "desktop");
      }
      setForceVisible(true);
    };

    window.addEventListener("pwa-show-install", onForce);
    return () => window.removeEventListener("pwa-show-install", onForce);
  }, []);

  // Auto-show + beforeinstallprompt listener
  useEffect(() => {
    if (isPwaInstalled()) return;

    let wasDismissed = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const t = Number(raw);
        if (!Number.isNaN(t) && Date.now() - t < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
          wasDismissed = true;
        }
      }
    } catch { /* ignore */ }

    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
      setPlatform("ios");
      if (!wasDismissed) setForceVisible(true);
    } else {
      setPlatform(/Android/.test(ua) ? "android" : "desktop");
    }

    if (!wasDismissed) {
      const onBip = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setForceVisible(true);
      };
      window.addEventListener("beforeinstallprompt", onBip);
      return () => window.removeEventListener("beforeinstallprompt", onBip);
    }
  }, []);

  const handleInstall = useCallback(async () => {
    if (platform === "ios") {
      markDismissed();
      setForceVisible(false);
      return;
    }

    if (!deferredPrompt) {
      window.location.reload();
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome !== "accepted") markDismissed();
      setForceVisible(false);
    } catch {
      markDismissed();
      setForceVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt, platform]);

  const handleDismiss = useCallback(() => {
    markDismissed();
    setForceVisible(false);
  }, []);

  if (!forceVisible || !platform) return null;

  const needsRefresh = !deferredPrompt && platform !== "ios";

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-2xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <img src="/icon-48.png" alt="" className="mt-0.5 h-10 w-10 rounded-xl" aria-hidden />
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
          {needsRefresh ? <RefreshCw className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {needsRefresh ? t("refreshButton") : platform === "ios" ? t("iosButton") : t("button")}
        </button>
      </div>
    </div>
  );
}
