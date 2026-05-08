"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, MapPin, BarChart3, ShieldCheck, Heart, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function Hero() {
  const t = useTranslations("landing");
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={ref} className="relative pt-36 pb-24 md:pt-44 md:pb-36 px-6 overflow-hidden">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 -z-5 opacity-[0.03] dark:opacity-[0.03] opacity-[0.06]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Text content */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              <span className="text-[12px] text-gray-500 dark:text-[#94a3b8] tracking-[-0.13px]">
                {t("heroBadge")}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[42px] md:text-[64px] font-medium leading-[1.05] tracking-[-1.4px] md:tracking-[-1.9px] mb-6 text-gray-900 dark:text-[#f8fafc]"
            >
              {t("heroHeadlinePart1")}{" "}
              <span className="block bg-gradient-to-r from-rose-500 to-rose-600 dark:from-rose-400 dark:via-rose-500 dark:to-rose-600 bg-clip-text text-transparent">
                {t("heroHeadlinePart2")}
              </span>
              {t("heroHeadlinePart3") && (
                <span className="block">{t("heroHeadlinePart3")}</span>
              )}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[17px] text-gray-500 dark:text-[#94a3b8] leading-relaxed max-w-lg mb-10"
            >
              {t("heroSubtitle")}
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 h-12 px-6 bg-rose-500 hover:bg-rose-600 text-white font-medium text-[15px] rounded-lg transition-all shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30"
              >
                {t("heroCTA1")}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 border border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.12] bg-gray-50 dark:bg-white/[0.02] text-gray-600 dark:text-[#cbd5e1] hover:text-gray-900 dark:hover:text-white font-medium text-[15px] rounded-lg transition-all"
              >
                <PlayIcon />
                {t("heroCTA2")}
              </Link>
            </motion.div>

            {/* Feature mini-pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap items-center gap-3 mt-12"
            >
              {[
                { icon: MapPin, label: t("heroPillMap") },
                { icon: BarChart3, label: t("heroPillAnalytics") },
                { icon: ShieldCheck, label: t("heroPillPin") },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/[0.04] bg-gray-50 dark:bg-white/[0.01]"
                >
                  <item.icon className="w-3.5 h-3.5 text-rose-500/70 dark:text-rose-400/70" />
                  <span className="text-[12px] text-gray-400 dark:text-[#64748b]">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{ y, opacity }}
            className="relative"
          >
            {/* Glow behind mockup */}
            <div className="hidden dark:block absolute inset-0 bg-gradient-to-r from-rose-500/10 to-violet-500/10 blur-[60px] rounded-3xl" />

            <div className="relative rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-[#0f172a]/90 backdrop-blur shadow-xl dark:shadow-2xl dark:shadow-black/40 overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2.5 px-4 h-10 border-b border-gray-200 dark:border-white/[0.04]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]/50" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="w-40 h-5 rounded-md bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.04] flex items-center justify-center">
                    <Sparkles className="w-2.5 h-2.5 text-rose-400/50 mr-1" />
                    <span className="text-[9px] text-gray-400 dark:text-[#475569] tracking-wide">encounter.app</span>
                  </div>
                </div>
              </div>

              {/* Dashboard grid */}
              <div className="p-4 grid grid-cols-5 gap-3 aspect-[16/10]">
                {/* Sidebar */}
                <div className="col-span-1 flex flex-col gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 rounded-md bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.03]" />
                  ))}
                </div>

                {/* Main content area */}
                <div className="col-span-4 grid grid-cols-3 gap-3">
                  {/* Stat cards */}
                  <div className="col-span-1 flex flex-col gap-3">
                    <div className="flex-1 rounded-lg bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.03] p-3 flex flex-col justify-center">
                      <div className="text-[10px] text-gray-400 dark:text-[#475569] mb-1">This month</div>
                      <div className="text-2xl font-semibold text-gray-800 dark:text-white/80">12</div>
                      <div className="text-[10px] text-rose-500/70 dark:text-rose-400/70">+2 vs last</div>
                    </div>
                    <div className="flex-1 rounded-lg bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.03] p-3 flex flex-col justify-center">
                      <div className="text-[10px] text-gray-400 dark:text-[#475569] mb-1">Avg mood</div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4].map((s) => (
                          <Heart key={s} className="w-3.5 h-3.5 text-rose-400/70 fill-rose-400/70" />
                        ))}
                        <Heart className="w-3.5 h-3.5 text-rose-400/20 fill-rose-400/20" />
                      </div>
                    </div>
                  </div>

                  {/* Map area */}
                  <div className="col-span-2 rounded-lg bg-gradient-to-br from-white dark:from-[#0f172a] to-gray-50 dark:to-[#1e293b] border border-gray-200 dark:border-white/[0.03] relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.06]" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.2) 1px, transparent 1px)`, backgroundSize: "20px 20px" }} />
                    {[{ x: 28, y: 35 }, { x: 45, y: 28 }, { x: 62, y: 52 }, { x: 38, y: 60 }, { x: 55, y: 40 }, { x: 70, y: 30 }, { x: 32, y: 45 }].map((pos, i) => (
                      <div key={i} className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                        <div className="relative">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/40" />
                          <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-30" style={{ animationDuration: `${2 + i * 0.5}s` }} />
                        </div>
                      </div>
                    ))}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 140">
                      <path d="M56 49 Q80 35 90 39 Q110 45 124 73 Q130 80 110 84 Q90 88 76 70 Q60 50 64 63" fill="none" stroke="rgba(244,63,94,0.15)" strokeWidth="1" />
                    </svg>
                  </div>

                  {/* Chart area */}
                  <div className="col-span-3 rounded-lg bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.03] p-3">
                    <div className="flex items-end justify-between h-12 gap-[2px]">
                      {[35, 55, 42, 68, 48, 72, 52, 80, 45, 60, 70, 55, 65, 40, 75, 58, 82, 48, 62, 52, 70, 58].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t-[1px] bg-gradient-to-t from-rose-500/30 via-rose-500/20 to-transparent" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating card 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="absolute -bottom-4 -left-6 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/[0.06] rounded-xl p-3 shadow-lg dark:shadow-xl flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-800 dark:text-white/90">{t("heroFloatingPin")}</div>
                <div className="text-[10px] text-gray-400 dark:text-[#64748b]">{t("heroFloatingPinSub")}</div>
              </div>
            </motion.div>

            {/* Floating card 2 */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="absolute -top-4 -right-6 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/[0.06] rounded-xl p-3 shadow-lg dark:shadow-xl flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-800 dark:text-white/90">{t("heroFloatingGrowth")}</div>
                <div className="text-[10px] text-emerald-500/80 dark:text-emerald-400/80">{t("heroFloatingGrowthSub")}</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="flex justify-center mt-20">
          <div className="w-5 h-8 rounded-full border border-gray-200 dark:border-white/[0.08] flex items-start justify-center p-1">
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} className="w-1 h-1.5 rounded-full bg-gray-300 dark:bg-white/30" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5 3.5L12 8L5 12.5V3.5Z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  );
}
