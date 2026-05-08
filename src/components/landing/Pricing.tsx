"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Sparkles, Lock, Infinity } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const accentColors: Record<string, { border: string; bg: string; text: string }> = {
  slate: { border: "border-gray-200 dark:border-white/[0.06]", bg: "bg-white dark:bg-white/[0.02]", text: "text-gray-500 dark:text-[#94a3b8]" },
  violet: { border: "border-violet-500/20", bg: "bg-violet-50 dark:bg-violet-500/[0.04]", text: "text-violet-500 dark:text-violet-400" },
  amber: { border: "border-amber-500/15", bg: "bg-amber-50 dark:bg-amber-500/[0.04]", text: "text-amber-500 dark:text-amber-400" },
};

export function Pricing() {
  const t = useTranslations("landing");
  const [yearly, setYearly] = useState(false);

  const tiers = [
    {
      name: t("pricingFreeName"),
      description: t("pricingFreeDesc"),
      monthlyPrice: 0,
      yearlyPrice: 0,
      showToggle: false,
      popular: false,
      accent: "slate",
      features: Array.from({ length: 5 }, (_, i) => t(`pricingFreeFeature${i + 1}`)),
      ctaLink: "/register",
      ctaDisabled: false,
      ctaText: t("pricingFreeCTA"),
    },
    {
      name: t("pricingProName"),
      description: t("pricingProDesc"),
      monthlyPrice: 4.99,
      yearlyPrice: 39.99,
      yearlyMonthly: "3.33",
      showToggle: true,
      popular: true,
      accent: "violet",
      features: Array.from({ length: 10 }, (_, i) => t(`pricingProFeature${i + 1}`)),
      ctaDisabled: true,
      ctaText: t("pricingProCTA"),
    },
    {
      name: t("pricingLifetimeName"),
      description: t("pricingLifetimeDesc"),
      monthlyPrice: 129,
      yearlyPrice: 0,
      showToggle: false,
      popular: false,
      accent: "amber",
      features: Array.from({ length: 5 }, (_, i) => t(`pricingLifetimeFeature${i + 1}`)),
      ctaDisabled: true,
      ctaText: t("pricingLifetimeCTA"),
    },
  ];

  return (
    <section id="pricing" className="py-24 md:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-rose-500/20 bg-rose-50 dark:bg-rose-500/[0.06] mb-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span className="text-[13px] font-medium text-rose-600 dark:text-rose-300">
              {t("pricingBetaBanner")}
            </span>
          </div>

          <p className="text-[13px] font-medium text-gray-500 dark:text-[#94a3b8] tracking-wide mb-3 uppercase">
            {t("pricingKicker")}
          </p>
          <h2 className="text-[32px] md:text-[40px] font-medium tracking-[-0.7px] md:tracking-[-0.9px] leading-[1.15] mb-4 text-gray-900 dark:text-[#f8fafc]">
            {t("pricingHeading")}{" "}
            <span className="text-rose-500 dark:text-rose-400">{t("pricingHeadingHighlight")}</span>
          </h2>
          <p className="text-[15px] text-gray-500 dark:text-[#94a3b8] leading-relaxed max-w-lg mx-auto">
            {t("pricingSubtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center gap-3 mb-10"
        >
          <span className={`text-[13px] transition-colors ${!yearly ? "text-gray-900 dark:text-[#f8fafc] font-medium" : "text-gray-400 dark:text-[#64748b]"}`}>{t("pricingMonthly")}</span>
          <button onClick={() => setYearly(!yearly)} className="relative w-10 h-5 rounded-full bg-gray-200 dark:bg-white/[0.06] border border-gray-300 dark:border-white/[0.08] transition-colors hover:bg-gray-300 dark:hover:bg-white/[0.08]">
            <motion.div animate={{ x: yearly ? 16 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="absolute top-1 w-3 h-3 rounded-full bg-rose-500" />
          </button>
          <button onClick={() => setYearly(true)} className={`text-[13px] transition-colors flex items-center gap-2 ${yearly ? "text-gray-900 dark:text-[#f8fafc] font-medium" : "text-gray-400 dark:text-[#64748b]"}`}>
            {t("pricingYearly")}
            <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/15 text-rose-500 dark:text-rose-400">{t("pricingYearlySuffix")}</span>
          </button>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {tiers.map((tier, i) => {
            const a = accentColors[tier.accent];
            const price = tier.showToggle && yearly ? tier.yearlyPrice : tier.monthlyPrice;
            const isFree = tier.monthlyPrice === 0;
            const isLifetime = tier.name === t("pricingLifetimeName");
            const periodLabel = isLifetime ? t("pricingLifetimePeriod") : isFree ? "" : yearly && tier.showToggle ? "/yr" : "/mo";

            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative rounded-xl border p-6 md:p-8 flex flex-col ${a.border} ${a.bg}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/15 text-[11px] font-medium text-violet-600 dark:text-violet-300 flex items-center gap-1 whitespace-nowrap">
                    <Sparkles className="w-3 h-3" />
                    {t("pricingMostPopular")}
                  </div>
                )}

                <div className="flex items-center gap-2 mb-1.5">
                  {isLifetime && <Infinity className="w-4 h-4 text-amber-500 dark:text-amber-400" />}
                  <h3 className={`text-[17px] font-semibold ${isFree ? "text-gray-600 dark:text-[#cbd5e1]" : "text-gray-900 dark:text-[#f8fafc]"}`}>{tier.name}</h3>
                </div>
                <p className="text-[13px] text-gray-400 dark:text-[#64748b] mb-5 leading-relaxed">{tier.description}</p>

                <div className="mb-6">
                  {isFree ? (
                    <div className="flex items-baseline">
                      <span className="text-[36px] font-semibold tracking-[-0.8px] text-gray-900 dark:text-[#f8fafc]">$0</span>
                      <span className="text-[14px] text-gray-400 dark:text-[#64748b] ml-1">/mo</span>
                    </div>
                  ) : isLifetime ? (
                    <div className="flex items-baseline">
                      <span className="text-[36px] font-semibold tracking-[-0.8px] text-gray-900 dark:text-[#f8fafc]">$129</span>
                      <span className="text-[14px] text-gray-400 dark:text-[#64748b] ml-1">{periodLabel}</span>
                    </div>
                  ) : yearly && tier.showToggle ? (
                    <div>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-[36px] font-semibold tracking-[-0.8px] text-gray-900 dark:text-[#f8fafc]">
                          ${tier.yearlyMonthly}
                        </span>
                        <span className="text-[14px] text-gray-400 dark:text-[#64748b]">/mo</span>
                        <span className="text-[16px] text-gray-300 dark:text-[#64748b] line-through ml-1">
                          ${tier.monthlyPrice}/mo
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-400 dark:text-[#475569]">
                        {t("pricingProYearlyBilling")}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-[36px] font-semibold tracking-[-0.8px] text-gray-900 dark:text-[#f8fafc]">${price}</span>
                      <span className="text-[14px] text-gray-400 dark:text-[#64748b]">{periodLabel}</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.features.map((feat: string) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500/70 dark:text-emerald-400/70 mt-0.5 flex-shrink-0" />
                      <span className="text-[13px] text-gray-600 dark:text-[#cbd5e1] leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>

                {tier.ctaDisabled ? (
                  <button disabled className="w-full h-11 rounded-lg border border-gray-200 dark:border-white/[0.06] bg-gray-100 dark:bg-white/[0.02] text-[13px] font-medium text-gray-400 dark:text-[#475569] flex items-center justify-center gap-2 cursor-not-allowed">
                    <Lock className="w-3.5 h-3.5" />
                    {tier.ctaText}
                  </button>
                ) : (
                  <Link href={tier.ctaLink || "/register"} className="w-full h-11 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/[0.04] text-[14px] font-medium text-gray-600 dark:text-[#cbd5e1] hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-2 transition-colors">
                    {tier.ctaText}
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }} className="text-center">
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-2xl bg-rose-500/[0.06] blur-2xl" />
            <div className="relative rounded-xl border border-rose-500/15 bg-rose-50 dark:bg-rose-500/[0.04] px-6 py-4">
              <p className="text-[14px] text-gray-800 dark:text-[#f8fafc] font-medium mb-1">{t("pricingBottomTitle")}</p>
              <p className="text-[12px] text-gray-500 dark:text-[#94a3b8] leading-relaxed max-w-md">
                {t("pricingBottomDesc")}{" "}
                <span className="text-rose-500 dark:text-rose-400 font-medium">{t("pricingBottomDescHighlight")}</span>
                {" "}{t("pricingBottomDescSuffix")}
              </p>
              <Link href="/register" className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-medium text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors">
                {t("pricingBottomCTA")}
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
