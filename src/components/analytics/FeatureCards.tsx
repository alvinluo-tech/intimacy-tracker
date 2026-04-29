"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles, Film } from "lucide-react";
import { toast } from "sonner";

export function FeatureCards() {
  const t = useTranslations("analytics");
  const router = useRouter();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => toast.info(t("yourWrappedComingSoon"))}
        className="relative overflow-hidden flex items-center gap-4 rounded-[20px] bg-surface p-5 border border-border text-left group transition-all"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-rose-500 shadow-lg shadow-purple-500/20">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="text-[16px] font-semibold text-content">{t("yourWrapped")}</div>
          <div className="text-[13px] text-muted mt-0.5">{t("yourWrappedDesc")}</div>
        </div>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => router.push("/playback")}
        className="relative overflow-hidden flex items-center gap-4 rounded-[20px] bg-surface p-5 border border-border text-left group transition-all"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
          <Film className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="text-[16px] font-semibold text-content">{t("footprintPlayback")}</div>
          <div className="text-[13px] text-muted mt-0.5">{t("footprintPlaybackDesc")}</div>
        </div>
      </motion.button>
    </div>
  );
}
