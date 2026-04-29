"use client";

import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { Clock, MapPin, Star } from "lucide-react";

import type { PlaybackEncounter } from "@/features/playback/types";

export function EncounterInfoCard({
  encounter,
  currentIndex,
  total,
}: {
  encounter: PlaybackEncounter;
  currentIndex: number;
  total: number;
}) {
  const t = useTranslations("playback");

  const date = new Date(encounter.started_at);
  const dateStr = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const locationParts = [
    encounter.location_label,
    encounter.city,
    encounter.country,
  ].filter(Boolean);

  return (
    <div className="pointer-events-none absolute left-1/2 top-[calc(3.5rem+var(--safe-top))] z-10 w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 md:top-24 md:right-6 md:left-auto md:w-80 md:translate-x-0">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={encounter.id}
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -30, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
          className="pointer-events-auto rounded-2xl border border-border/10 bg-surface/80 p-3 shadow-2xl backdrop-blur-xl md:p-5"
        >
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-bold text-content md:text-lg">
              {encounter.partner?.nickname ?? t("unknown")}
            </h3>
            {encounter.rating != null && (
              <span className="flex items-center gap-1 font-mono text-xs text-primary md:text-sm">
                <Star className="h-3 w-3 fill-current md:h-3.5 md:w-3.5" />
                {encounter.rating.toFixed(1)}
              </span>
            )}
          </div>

          <p className="mb-2 text-[12px] text-muted md:mb-3 md:text-[13px]">
            {dateStr} · {timeStr}
          </p>

          <div className="flex flex-wrap gap-x-3 gap-y-1 md:flex-col md:gap-y-1">
            {locationParts.length > 0 && (
              <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted md:text-[13px]">
                <MapPin className="h-3 w-3 shrink-0 text-primary md:h-3.5 md:w-3.5" />
                <span className="min-w-0 truncate">{locationParts.join(" · ")}</span>
              </p>
            )}

            {encounter.duration_minutes != null && (
              <p className="flex items-center gap-1.5 text-[12px] text-muted md:text-[13px]">
                <Clock className="h-3 w-3 shrink-0 text-primary md:h-3.5 md:w-3.5" />
                <span>
                  {encounter.duration_minutes}
                  {t("minutes")}
                </span>
              </p>
            )}
          </div>

          {encounter.tags.length > 0 && (
            <div className="mb-2 mt-2 flex flex-wrap gap-1.5 md:mb-3 md:mt-0">
              {encounter.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-md border border-border/20 bg-background px-1.5 py-0.5 text-[10px] text-content md:px-2 md:text-[11px]"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="text-[10px] text-muted md:text-[11px]">
            {currentIndex + 1} / {total}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
