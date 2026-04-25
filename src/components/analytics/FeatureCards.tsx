"use client";

import { motion } from "framer-motion";
import { Sparkles, Film } from "lucide-react";
import { useRouter } from "next/navigation";

export function FeatureCards() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Your Wrapped */}
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => router.push("/wrapped")}
        className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-slate-900 via-[#1e1025] to-[#2c0b1f] p-5 text-left border border-white/[0.05] shadow-[0_0_20px_rgba(244,63,94,0.05)] hover:shadow-[0_0_30px_rgba(244,63,94,0.1)] transition-shadow"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-rose-500/10 opacity-0 hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-pink-400 to-rose-500 shadow-inner">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-[16px] font-medium text-slate-100">Your Wrapped</div>
            <div className="text-[13px] text-slate-400 mt-0.5">View your intimate moments visualized</div>
          </div>
        </div>
      </motion.button>

      {/* Footprint Playback */}
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => router.push("/map")}
        className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-slate-900 via-[#0a1428] to-[#051020] p-5 text-left border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)] hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-shadow"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-cyan-400 to-blue-500 shadow-inner">
            <Film className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-[16px] font-medium text-slate-100">Footprint Playback</div>
            <div className="text-[13px] text-slate-400 mt-0.5">Relive your journey on the map</div>
          </div>
        </div>
      </motion.button>
    </div>
  );
}
