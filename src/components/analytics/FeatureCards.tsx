"use client";

import { motion } from "motion/react";
import { Sparkles, Film } from "lucide-react";
import { toast } from "sonner";

export function FeatureCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => toast.info("Your Wrapped is coming soon")}
        className="relative overflow-hidden flex items-center gap-4 rounded-[20px] bg-[#0f172a] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-white/[0.05] text-left group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="text-[16px] font-semibold text-white">Your Wrapped</div>
          <div className="text-[13px] text-[#8b95a3] mt-0.5">View your intimate moments visualized</div>
        </div>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => toast.info("Footprint Playback is coming soon")}
        className="relative overflow-hidden flex items-center gap-4 rounded-[20px] bg-[#0f172a] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border border-white/[0.05] text-left group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
          <Film className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="text-[16px] font-semibold text-white">Footprint Playback</div>
          <div className="text-[13px] text-[#8b95a3] mt-0.5">Relive your journey on the map</div>
        </div>
      </motion.button>
    </div>
  );
}
