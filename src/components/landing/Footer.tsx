"use client";

import { Heart, Github, Globe } from "lucide-react";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("landing");

  const columns = [
    {
      title: t("footerProduct"),
      links: [
        { label: t("features"), href: "#features" },
        { label: t("howItWorks"), href: "#how-it-works" },
        { label: t("pricing"), href: "#pricing" },
      ],
    },
    {
      title: t("footerDeveloper"),
      links: [
        { label: "GitHub", href: "https://github.com/alvinluo-tech", icon: Github, external: true },
        { label: "Blog", href: "https://alvin-luo.me/", icon: Globe, external: true },
      ],
    },
    {
      title: t("footerLegal"),
      links: [
        { label: t("footerPrivacy"), href: "#" },
        { label: t("footerTerms"), href: "#" },
        { label: t("footerSecurity"), href: "#" },
      ],
    },
  ];

  return (
    <footer className="border-t border-gray-200 dark:border-white/[0.04] py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <span className="font-semibold text-base tracking-tight text-gray-900 dark:text-[#f8fafc]">Encounter</span>
            </a>
            <p className="text-[13px] text-gray-400 dark:text-[#64748b] leading-relaxed max-w-[220px]">
              {t("footerDesc")}{" "}
              <a href="https://github.com/alvinluo-tech" target="_blank" rel="noopener noreferrer" className="text-rose-500/80 dark:text-rose-400/80 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">
                @alvinluo-tech
              </a>
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-[12px] font-medium text-gray-400 dark:text-[#f8fafc]/50 tracking-wide mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={"external" in link && link.external ? "_blank" : undefined}
                      rel={"external" in link && link.external ? "noopener noreferrer" : undefined}
                      className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 dark:text-[#64748b] hover:text-gray-600 dark:hover:text-[#cbd5e1] transition-colors"
                    >
                      {"icon" in link && link.icon && <link.icon className="w-3.5 h-3.5" />}
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between mt-16 pt-8 border-t border-gray-200 dark:border-white/[0.04]">
          <p className="text-[12px] text-gray-400 dark:text-[#475569]">&copy; {new Date().getFullYear()} {t("footerCopyright")}</p>
          <p className="flex items-center gap-1 text-[12px] text-gray-400 dark:text-[#475569] mt-2 sm:mt-0">
            {t("footerBuiltWith")}{" "}
            <Heart className="w-3 h-3 text-rose-500 dark:text-rose-400 fill-rose-500 dark:fill-rose-400" />{" "}
            {t("footerBy")}{" "}
            <a href="https://alvin-luo.me/" target="_blank" rel="noopener noreferrer" className="text-rose-500/70 dark:text-rose-400/70 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">
              Alvin Luo
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
