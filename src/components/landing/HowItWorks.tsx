"use client";

import { motion } from "motion/react";
import { LogIn, MapPin, BarChart3, Users } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: LogIn,
    title: "Create your account",
    desc: "Sign up in seconds. Set a PIN code for instant privacy protection. No personal data required.",
  },
  {
    number: "02",
    icon: MapPin,
    title: "Log your moments",
    desc: "Pin locations on an interactive map, log mood and notes. Each entry is encrypted end-to-end.",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Discover insights",
    desc: "View beautiful charts of frequency, mood trends, and patterns. Understand your relationship better.",
  },
  {
    number: "04",
    icon: Users,
    title: "Sync with your partner",
    desc: "Invite your partner to sync. Share moments together while keeping your individual privacy.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 md:mb-20"
        >
          <p className="text-[13px] font-medium text-rose-400 tracking-wide mb-3">
            GET STARTED IN MINUTES
          </p>
          <h2 className="text-[32px] md:text-[40px] font-medium tracking-[-0.7px] md:tracking-[-0.9px] leading-[1.15] mb-4">
            How <span className="text-rose-400">Encounter</span> works
          </h2>
          <p className="text-[16px] text-[#94a3b8] max-w-xl leading-relaxed">
            Four simple steps to start tracking your intimate journey securely and beautifully.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Vertical line (desktop) */}
          <div className="hidden lg:block absolute left-[23px] top-0 bottom-0 w-[1px] bg-gradient-to-b from-rose-500/20 via-white/[0.04] to-rose-500/10" />

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
                {/* Circle on timeline */}
                <div className="hidden lg:flex absolute left-0 top-0 w-[47px] h-[47px] rounded-full border-2 border-white/[0.04] bg-[#0f172a] items-center justify-center z-10">
                  <div className="w-3 h-3 rounded-full bg-rose-500/60" />
                </div>

                {/* Card */}
                <div className="lg:ml-0 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] p-6 flex gap-5 items-start transition-colors duration-300">
                  {/* Mobile number + icon */}
                  <div className="lg:hidden flex-shrink-0 w-12 h-12 rounded-xl bg-rose-500/8 border border-rose-500/15 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-rose-400" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-[12px] font-medium text-rose-400/70">
                        {step.number}
                      </span>
                      {/* Desktop icon */}
                      <step.icon className="hidden lg:block w-4 h-4 text-rose-400/60" />
                      <h3 className="text-[17px] font-semibold text-[#f8fafc] tracking-[-0.15px]">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-[14px] text-[#64748b] leading-relaxed lg:pl-0">
                      {step.desc}
                    </p>
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
