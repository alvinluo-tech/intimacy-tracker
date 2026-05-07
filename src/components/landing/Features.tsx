"use client";

import { motion } from "motion/react";
import {
  MapPin,
  BarChart3,
  Shield,
  Users,
  Clock,
  Heart,
} from "lucide-react";

const cards = [
  {
    icon: MapPin,
    title: "Interactive Map",
    desc: "Pin every moment on a beautiful map. See heatmaps, clusters, and your journey across cities and countries.",
    accent: "rose",
    size: "lg",
    visual: "map",
  },
  {
    icon: BarChart3,
    title: "Smart Analytics",
    desc: "Discover patterns with elegant charts. Track frequency, mood trends, duration stats, and more.",
    accent: "violet",
    size: "md",
    visual: "chart",
  },
  {
    icon: Shield,
    title: "Privacy First",
    desc: "E2E encryption, PIN protection, and zero-knowledge architecture. Even we can't see your data.",
    accent: "emerald",
    size: "sm",
    visual: "lock",
  },
  {
    icon: Users,
    title: "Couple Sync",
    desc: "Seamlessly sync with your partner. Share moments together, keep individual privacy intact.",
    accent: "sky",
    size: "sm",
    visual: "sync",
  },
  {
    icon: Clock,
    title: "Timeline View",
    desc: "Browse your history in a stunning timeline. Filter by date, location, mood, or duration.",
    accent: "amber",
    size: "md",
    visual: "timeline",
  },
  {
    icon: Heart,
    title: "Mood Tracking",
    desc: "Log how you felt each time. Understand the emotional patterns behind your connection.",
    accent: "rose",
    size: "sm",
    visual: "mood",
  },
];

const accentMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  rose: {
    bg: "bg-rose-500/8",
    border: "border-rose-500/15",
    text: "text-rose-400",
    glow: "shadow-rose-500/5",
  },
  violet: {
    bg: "bg-violet-500/8",
    border: "border-violet-500/15",
    text: "text-violet-400",
    glow: "shadow-violet-500/5",
  },
  emerald: {
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/15",
    text: "text-emerald-400",
    glow: "shadow-emerald-500/5",
  },
  sky: {
    bg: "bg-sky-500/8",
    border: "border-sky-500/15",
    text: "text-sky-400",
    glow: "shadow-sky-500/5",
  },
  amber: {
    bg: "bg-amber-500/8",
    border: "border-amber-500/15",
    text: "text-amber-400",
    glow: "shadow-amber-500/5",
  },
};

export function Features() {
  return (
    <section id="features" className="py-24 md:py-32 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 md:mb-20"
        >
          <p className="text-[13px] font-medium text-rose-400 tracking-wide mb-3">
            EVERYTHING YOU NEED
          </p>
          <h2 className="text-[32px] md:text-[40px] font-medium tracking-[-0.7px] md:tracking-[-0.9px] leading-[1.15] mb-4">
            Privacy-first tools for{" "}
            <span className="text-rose-400">deeper connection</span>
          </h2>
          <p className="text-[16px] text-[#94a3b8] max-w-xl leading-relaxed">
            Built from the ground up with your privacy as the foundation. Every
            feature is designed to enhance your relationship without compromising security.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 auto-rows-auto">
          {cards.map((card, i) => {
            const a = accentMap[card.accent];
            const sizeClass =
              card.size === "lg"
                ? "lg:col-span-2 lg:row-span-2"
                : card.size === "md"
                  ? "lg:col-span-2"
                  : "lg:col-span-1";

            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`${sizeClass} group relative rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] p-6 flex flex-col transition-colors duration-300`}
              >
                {/* Icon */}
                <div
                  className={`w-9 h-9 rounded-lg ${a.bg} border ${a.border} flex items-center justify-center mb-4 ${a.glow}`}
                >
                  <card.icon className={`w-4.5 h-4.5 ${a.text}`} />
                </div>

                {/* Text */}
                <h3 className="text-[15px] font-semibold text-[#f8fafc] mb-2 tracking-[-0.15px]">
                  {card.title}
                </h3>
                <p className="text-[13px] text-[#64748b] leading-relaxed flex-1">
                  {card.desc}
                </p>

                {/* Visual element */}
                <div className="mt-5 rounded-lg border border-white/[0.03] bg-[#0f172a]/50 overflow-hidden">
                  {card.visual === "map" && <MapVisual />}
                  {card.visual === "chart" && <ChartVisual />}
                  {card.visual === "lock" && <LockVisual />}
                  {card.visual === "sync" && <SyncVisual />}
                  {card.visual === "timeline" && <TimelineVisual />}
                  {card.visual === "mood" && <MoodVisual />}
                </div>

                {/* Hover glow */}
                <div
                  className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${a.bg}`}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---- Visual components ---- */

function MapVisual() {
  return (
    <div className="h-32 bg-[#0f172a] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 100">
        <path
          d="M40 80 Q80 30 130 50 T220 40 T280 60"
          fill="none"
          stroke="rgba(244,63,94,0.2)"
          strokeWidth="1"
        />
        <path
          d="M60 70 Q100 40 150 55 T240 45"
          fill="none"
          stroke="rgba(244,63,94,0.1)"
          strokeWidth="0.5"
          strokeDasharray="2 4"
        />
        {[[80, 50], [120, 42], [180, 55], [150, 48], [220, 38]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="2.5" fill="#F43F5E" opacity="0.8" />
            <circle cx={x} cy={y} r="6" fill="none" stroke="rgba(244,63,94,0.15)" strokeWidth="1" />
          </g>
        ))}
      </svg>
    </div>
  );
}

function ChartVisual() {
  return (
    <div className="h-24 px-3 py-4 flex items-end justify-center gap-[1px]">
      {[30, 55, 40, 65, 48, 72, 52, 80, 45, 60, 35, 70, 55, 75, 42, 68, 50, 78, 62, 58, 45, 70, 55, 65].map(
        (h, i) => (
          <div
            key={i}
            className="w-[5px] rounded-t-[1px]"
            style={{
              height: `${h}%`,
              background: `linear-gradient(to top, rgba(139,92,246,0.3), rgba(139,92,246,0.05))`,
            }}
          />
        )
      )}
    </div>
  );
}

function LockVisual() {
  return (
    <div className="h-20 flex items-center justify-center">
      <div className="w-10 h-12 rounded-md border-2 border-emerald-500/20 bg-emerald-500/5 relative flex items-end justify-center pb-1.5">
        <div className="absolute -top-3 w-6 h-5 rounded-t-full border-2 border-b-0 border-emerald-500/20" />
        <div className="w-1.5 h-2.5 rounded-full bg-emerald-400/60" />
      </div>
    </div>
  );
}

function SyncVisual() {
  return (
    <div className="h-20 flex items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/15 flex items-center justify-center">
        <Users className="w-3.5 h-3.5 text-sky-400/70" />
      </div>
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full bg-sky-400/50"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/15 flex items-center justify-center">
        <Users className="w-3.5 h-3.5 text-sky-400/70" />
      </div>
    </div>
  );
}

function TimelineVisual() {
  return (
    <div className="flex flex-col gap-3 px-2 py-3">
      {/* Card 1 - with detail */}
      <div className="rounded-xl border border-white/[0.04] bg-[#0f172a]/70 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-[#94a3b8]">Jun 23, 2025</span>
              <div className="flex items-center gap-1 rounded-full bg-[#0f172a] px-1.5 py-0.5 border border-white/[0.03]">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
                <span className="text-[9px] text-[#64748b] truncate max-w-[40px]">Luna</span>
              </div>
            </div>
            <span className="text-[10px] text-[#475569]">9:30 PM</span>
          </div>
          <span className="text-[10px] text-[#475569] shrink-0">3d ago</span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-1 text-[#64748b]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            <span className="text-[10px]">32 min</span>
          </div>
          <div className="flex items-center gap-1 text-[#64748b]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-[10px]">Tokyo, Shinjuku</span>
          </div>
          <span className="text-[14px] leading-none">🥰</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg key={s} width="8" height="8" viewBox="0 0 24 24"
                fill={s <= 4 ? "#F43F5E" : "none"}
                stroke={s <= 4 ? "#F43F5E" : "#475569"}
                strokeWidth="1.5"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.03]">
          {["hotel", "weekend", "romantic"].map((tag) => (
            <span key={tag} className="rounded-full border border-white/[0.05] bg-white/[0.02] px-2 py-0.5 text-[8px] text-[#64748b]">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Connecting dot line */}
      <div className="flex items-center justify-center h-1">
        <div className="w-[1px] h-full bg-white/[0.06]" />
      </div>

      {/* Card 2 - simpler */}
      <div className="rounded-xl border border-white/[0.04] bg-[#0f172a]/70 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-[#94a3b8]">Jun 15, 2025</span>
              <div className="flex items-center gap-1 rounded-full bg-[#0f172a] px-1.5 py-0.5 border border-white/[0.03]">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-sky-400 to-blue-500" />
                <span className="text-[9px] text-[#64748b] truncate max-w-[40px]">Alex</span>
              </div>
            </div>
            <span className="text-[10px] text-[#475569]">10:15 AM</span>
          </div>
          <span className="text-[10px] text-[#475569] shrink-0">11d ago</span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-1 text-[#64748b]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            <span className="text-[10px]">18 min</span>
          </div>
          <div className="flex items-center gap-1 text-[#64748b]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-[10px]">Home</span>
          </div>
          <span className="text-[14px] leading-none">😊</span>
          <div className="flex gap-0.5">
            {[1, 2, 3].map((s) => (
              <svg key={s} width="8" height="8" viewBox="0 0 24 24"
                fill="#F43F5E" stroke="#F43F5E" strokeWidth="1.5"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-white/[0.03]">
          <span className="rounded-full border border-white/[0.05] bg-white/[0.02] px-2 py-0.5 text-[8px] text-[#64748b]">
            cozy
          </span>
        </div>
      </div>
    </div>
  );
}

function MoodVisual() {
  return (
    <div className="h-20 flex items-center justify-center gap-1.5">
      {[
        { emoji: "😊", opacity: "opacity-80" },
        { emoji: "🥰", opacity: "opacity-100" },
        { emoji: "😌", opacity: "opacity-70" },
        { emoji: "😏", opacity: "opacity-90" },
        { emoji: "❤️", opacity: "opacity-100" },
      ].map((m, i) => (
        <span key={i} className={`text-lg ${m.opacity}`}>
          {m.emoji}
        </span>
      ))}
    </div>
  );
}
