"use client";

import { motion } from "motion/react";
import { LogIn, MapPin, BarChart3, Users } from "lucide-react";
import { useTranslations } from "next-intl";

export function HowItWorks() {
  const t = useTranslations("landing");
  const steps = [
    { number: "01", icon: LogIn, title: t("step1Title"), desc: t("step1Desc") },
    { number: "02", icon: MapPin, title: t("step2Title"), desc: t("step2Desc") },
    { number: "03", icon: BarChart3, title: t("step3Title"), desc: t("step3Desc") },
    { number: "04", icon: Users, title: t("step4Title"), desc: t("step4Desc") },
  ];

  return (
    <section id="how-it-works" className="py-24 md:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 md:mb-20"
        >
          <p className="text-[13px] font-medium text-rose-500 dark:text-rose-400 tracking-wide mb-3">
            {t("stepsKicker")}
          </p>
          <h2 className="text-[32px] md:text-[40px] font-medium tracking-[-0.7px] md:tracking-[-0.9px] leading-[1.15] mb-4 text-gray-900 dark:text-[#f8fafc]">
            {t("stepsHeading")}
            <span className="text-rose-500 dark:text-rose-400">{t("stepsHeadingHighlight")}</span>
            {t("stepsHeadingSuffix")}
          </h2>
          <p className="text-[16px] text-gray-500 dark:text-[#94a3b8] max-w-xl leading-relaxed">
            {t("stepsSubtitle")}
          </p>
        </motion.div>

        <div className="relative">
          <div className="hidden lg:block absolute left-[23px] top-0 bottom-0 w-[1px] bg-gradient-to-b from-rose-500/20 via-gray-200 dark:via-white/[0.04] to-rose-500/10" />

          <div className="space-y-8 lg:space-y-0 lg:grid lg:grid-cols-1 lg:gap-0">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative lg:pl-16 lg:pb-16 last:lg:pb-0"
              >
                <div className="hidden lg:flex absolute left-0 top-0 w-[47px] h-[47px] rounded-full border-2 border-gray-200 dark:border-white/[0.04] bg-white dark:bg-[#0f172a] items-center justify-center z-10">
                  <div className="w-3 h-3 rounded-full bg-rose-500/60" />
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-white/[0.04] bg-white dark:bg-white/[0.01] hover:bg-gray-50 dark:hover:bg-white/[0.02] p-6 flex gap-5 items-start transition-colors duration-300">
                  <div className="lg:hidden flex-shrink-0 w-12 h-12 rounded-xl bg-rose-500/8 border border-rose-500/15 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-[12px] font-medium text-rose-500/70 dark:text-rose-400/70">{step.number}</span>
                      <step.icon className="hidden lg:block w-4 h-4 text-rose-500/60 dark:text-rose-400/60" />
                      <h3 className="text-[17px] font-semibold text-gray-900 dark:text-[#f8fafc] tracking-[-0.15px]">{step.title}</h3>
                    </div>
                    <p className="text-[14px] text-gray-400 dark:text-[#64748b] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
