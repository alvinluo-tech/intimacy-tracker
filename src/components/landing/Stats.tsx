"use client";

import { motion } from "motion/react";

const items = [
  { value: "100%", label: "Private", desc: "Your data never leaves your device" },
  { value: "E2E", label: "Encrypted", desc: "Zero-knowledge architecture" },
  { value: "PIN", label: "Protected", desc: "Biometric + code lock" },
  { value: "0", label: "Data Sold", desc: "We make money, not from you" },
];

export function Stats() {
  return (
    <section className="py-16 px-6 border-y border-white/[0.04] bg-white/[0.01]">
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
              <div className="text-[28px] md:text-[32px] font-semibold tracking-[-0.5px] text-[#f8fafc] mb-0.5">
                {item.value}
              </div>
              <div className="text-[14px] font-medium text-[#f8fafc]/80 mb-1">
                {item.label}
              </div>
              <div className="text-[12px] text-[#64748b] leading-snug">
                {item.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
