"use client";

import { useState, useEffect } from "react";
import { Menu, X, Sun, Moon, Languages, Download } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { isPwaInstalled, triggerInstallPrompt } from "@/components/pwa/PwaInstallPrompt";

export function Nav() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [installable, setInstallable] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Check if PWA is installable (not already installed, not iOS fullscreen)
  useEffect(() => {
    if (!mounted) return;
    if (isPwaInstalled()) return;
    setInstallable(true);
  }, [mounted]);

  const toggleLocale = () => {
    const next = locale === "en" ? "zh" : "en";
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleInstallClick = () => {
    triggerInstallPrompt();
  };

  const navLinks = [
    { label: t("features"), href: "#features" },
    { label: t("howItWorks"), href: "#how-it-works" },
    { label: t("pricing"), href: "#pricing" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 dark:bg-[#020617]/85 backdrop-blur-xl border-b border-gray-200 dark:border-white/[0.05]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo + Beta */}
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/icon-48.png"
            alt="Encounter"
            className="w-8 h-8 rounded-lg transition-transform group-hover:scale-105"
          />
          <span className="font-semibold text-base tracking-tight text-gray-900 dark:text-[#f8fafc]">
            Encounter
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400">
            {t("betaBadge")}
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[14px] text-gray-500 dark:text-[#94a3b8] hover:text-gray-900 dark:hover:text-[#f8fafc] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side: theme, locale, auth */}
        <div className="hidden md:flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] text-gray-500 dark:text-[#94a3b8] hover:text-gray-900 dark:hover:text-[#f8fafc] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
            aria-label="Toggle theme"
          >
            {mounted && theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Locale switcher */}
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] text-[13px] font-medium text-gray-600 dark:text-[#94a3b8] hover:text-gray-900 dark:hover:text-[#f8fafc] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
          >
            <Languages size={14} />
            {t("langLabel")}
          </button>

          <Link
            href="/login"
            className="text-[14px] text-gray-500 dark:text-[#94a3b8] hover:text-gray-900 dark:hover:text-[#f8fafc] transition-colors ml-2"
          >
            {t("signIn")}
          </Link>
          {installable && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] text-[13px] font-medium text-gray-500 dark:text-[#94a3b8] hover:text-gray-900 dark:hover:text-[#f8fafc] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors ml-1"
            >
              <Download size={14} />
              <span className="hidden lg:inline">{t("installApp")}</span>
            </button>
          )}
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-rose-500 hover:bg-rose-600 text-white text-[14px] font-medium rounded-lg transition-colors ml-1"
          >
            {t("tryBeta")}
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 -mr-2 text-gray-500 dark:text-[#94a3b8] hover:text-gray-900 dark:hover:text-[#f8fafc] transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-white/[0.05] bg-white/95 dark:bg-[#020617]/95 backdrop-blur-xl">
          <nav className="px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-[15px] text-gray-500 dark:text-[#94a3b8] hover:text-gray-900 dark:hover:text-[#f8fafc] transition-colors py-1"
              >
                {link.label}
              </a>
            ))}

            <hr className="border-gray-200 dark:border-white/[0.05]" />

            {/* Mobile: theme + locale row */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 text-[15px] text-gray-500 dark:text-[#94a3b8] hover:text-gray-900 dark:hover:text-[#f8fafc] transition-colors py-1"
              >
                {mounted && theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                <span>{mounted && theme === "dark" ? "Light" : "Dark"} mode</span>
              </button>
              <button
                onClick={toggleLocale}
                className="flex items-center gap-2 text-[15px] text-gray-500 dark:text-[#94a3b8] hover:text-gray-900 dark:hover:text-[#f8fafc] transition-colors py-1 ml-4"
              >
                <Languages size={16} />
                {locale === "en" ? "中文" : "English"}
              </button>
            </div>

            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="text-[15px] text-gray-500 dark:text-[#94a3b8] hover:text-gray-900 dark:hover:text-[#f8fafc] transition-colors py-1"
            >
              {t("signIn")}
            </Link>
            {installable && (
              <button
                onClick={() => { setMobileOpen(false); handleInstallClick(); }}
                className="flex items-center gap-2 text-[15px] text-gray-500 dark:text-[#94a3b8] hover:text-gray-900 dark:hover:text-[#f8fafc] transition-colors py-1"
              >
                <Download size={16} />
                {t("installApp")}
              </button>
            )}
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 bg-rose-500 hover:bg-rose-600 text-white text-[15px] font-medium rounded-lg transition-colors"
            >
              {t("tryBeta")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
