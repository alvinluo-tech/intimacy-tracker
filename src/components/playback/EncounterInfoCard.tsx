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
    <div className="pointer-events-none absolute left-1/2 top-20 z-10 w-[90%] max-w-md -translate-x-1/2 md:top-24 md:right-6 md:left-auto md:w-80 md:translate-x-0">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={encounter.id}
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -30, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
          className="pointer-events-auto rounded-2xl border border-border/10 bg-surface/80 p-5 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-lg font-bold text-content">
              {encounter.partner?.nickname ?? t("unknown")}
            </h3>
            {encounter.rating != null && (
              <span className="flex items-center gap-1 font-mono text-sm text-primary">
                <Star className="h-3.5 w-3.5 fill-current" />
                {encounter.rating.toFixed(1)}
              </span>
            )}
          </div>

          <p className="mb-3 text-[13px] text-muted">
            {dateStr} · {timeStr}
          </p>

          {locationParts.length > 0 && (
            <p className="mb-2 flex items-center gap-1.5 text-[13px] text-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{locationParts.join(" · ")}</span>
            </p>
          )}

          {encounter.duration_minutes != null && (
            <p className="mb-3 flex items-center gap-1.5 text-[13px] text-muted">
              <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                {encounter.duration_minutes}
                {t("minutes")}
              </span>
            </p>
          )}

          {encounter.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {encounter.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-md border border-border/20 bg-background px-2 py-0.5 text-[11px] text-content"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="text-[11px] text-muted">
            {currentIndex + 1} / {total}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
