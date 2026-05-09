"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";

// ---- Types ----

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop" | "unknown";

// ---- Read from inline script in layout.tsx ----

interface PwaGlobals {
  prompt: BeforeInstallPromptEvent | null;
  platform: Platform;
}

declare global {
  interface Window {
    __pwa?: PwaGlobals;
  }
}

function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return window.__pwa?.prompt ?? null;
}

function getPlatform(): Platform {
  return (window.__pwa?.platform as Platform) ?? "unknown";
}

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;

function checkInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function wasDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return (Date.now() - Number(raw)) / 86400000 < DISMISS_DAYS;
  } catch {
    return false;
  }
}

// ---- Public exports ----

export function isPwaInstalled(): boolean {
  return checkInstalled();
}

export function clearInstallDismissal() {
  localStorage.removeItem(DISMISS_KEY);
}

export function triggerInstallPrompt() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DISMISS_KEY);
  const dp = getDeferredPrompt();
  if (dp) {
    dp.prompt().catch(() => {});
  } else {
    window.dispatchEvent(new CustomEvent("pwa-show-install"));
  }
}

// ---- Hook ----

export function usePwa() {
  const [platform] = useState<Platform>(getPlatform());
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasDeferred, setHasDeferred] = useState(!!getDeferredPrompt());
  const hasRunRef = useRef(false);

  // Sync state once on mount (runs once, even in StrictMode)
  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    setIsInstalled(checkInstalled());
    setHasDeferred(!!getDeferredPrompt());

    const onInstallable = () => setHasDeferred(true);
    const onInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
    };

    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("pwa-installed", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("pwa-installed", onInstalled);
    };
  }, []);

  // Auto-show with delay
  useEffect(() => {
    if (isInstalled || wasDismissed()) return;

    const shouldShow =
      getPlatform() === "ios" ||
      !!getDeferredPrompt();

    if (shouldShow) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstalled, hasDeferred]);

  // Force-show from external button
  useEffect(() => {
    const handler = () => {
      if (!checkInstalled()) setShowPrompt(true);
    };
    window.addEventListener("pwa-show-install", handler);
    return () => window.removeEventListener("pwa-show-install", handler);
  }, []);

  const installApp = useCallback(async () => {
    const dp = getDeferredPrompt();
    console.log("[PWA] installApp, deferredPrompt:", !!dp);
    if (!dp) {
      console.warn("[PWA] No beforeinstallprompt captured");
      return;
    }
    try {
      await dp.prompt();
      const { outcome } = await dp.userChoice;
      console.log("[PWA] outcome:", outcome);
      if (outcome === "accepted") {
        setIsInstalled(true);
        setShowPrompt(false);
      }
    } catch (err) {
      console.error("[PWA] install error:", err);
    }
    setHasDeferred(false);
  }, []);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  return {
    platform,
    isInstalled,
    isInstallable: hasDeferred,
    isIOS: platform === "ios",
    showPrompt,
    installApp,
    dismissPrompt,
  } as const;
}

// ---- Component ----

export function PwaInstallPrompt() {
  const t = useTranslations("pwa");
  const { platform, isInstalled, isInstallable, isIOS, showPrompt, installApp, dismissPrompt } = usePwa();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || isInstalled || !showPrompt) return null;

  if (isIOS) {
    return (
      <div
        className="fixed z-[60] bottom-20 left-4 right-4 mx-auto max-w-[420px] rounded-2xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-xl flex flex-col items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300"
        role="dialog"
        aria-label={t("iosTitle")}
      >
        <button
          onClick={dismissPrompt}
          className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-content transition-colors"
          aria-label={t("dismiss")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
        <img src="/icon-192-maskable.png" alt="" className="h-10 w-10 rounded-xl" aria-hidden />
        <div className="text-center">
          <p className="text-[15px] font-semibold text-content">{t("iosTitle")}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{t("iosDescription")}</p>
        </div>
        <div className="text-muted animate-bounce" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
        </div>
      </div>
    );
  }

  if (isInstallable) {
    return (
      <div
        className="fixed z-[60] top-4 left-4 right-4 mx-auto max-w-[420px] rounded-2xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-top-2 fade-in duration-300"
        role="dialog"
        aria-label={t("title")}
      >
        <button
          onClick={dismissPrompt}
          className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-content transition-colors"
          aria-label={t("dismiss")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
        <img src="/icon-192-maskable.png" alt="" className="h-10 w-10 rounded-xl shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-content">{t("title")}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{t("description")}</p>
        </div>
        <button
          onClick={installApp}
          className="shrink-0 rounded-xl bg-primary px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          {t("button")}
        </button>
      </div>
    );
  }

  return null;
}
