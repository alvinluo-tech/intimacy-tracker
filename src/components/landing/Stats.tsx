"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";

export function Stats() {
  const t = useTranslations("landing");
  const items = [
    { value: t("statsPrivateValue"), label: t("statsPrivateLabel"), desc: t("statsPrivateDesc") },
    { value: t("statsEncryptedValue"), label: t("statsEncryptedLabel"), desc: t("statsEncryptedDesc") },
    { value: t("statsPinValue"), label: t("statsPinLabel"), desc: t("statsPinDesc") },
    { value: t("statsSoldValue"), label: t("statsSoldLabel"), desc: t("statsSoldDesc") },
  ];

  return (
    <section className="py-16 px-6 border-y border-gray-200 dark:border-white/[0.04] bg-gray-50/50 dark:bg-white/[0.01]">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-12">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="text-center lg:text-left"
            >
              <div className="text-[28px] md:text-[32px] font-semibold tracking-[-0.5px] text-gray-900 dark:text-[#f8fafc] mb-0.5">
                {item.value}
              </div>
              <div className="text-[14px] font-medium text-gray-700 dark:text-[#f8fafc]/80 mb-1">
                {item.label}
              </div>
              <div className="text-[12px] text-gray-400 dark:text-[#64748b] leading-snug">
                {item.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
