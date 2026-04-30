"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { useMapStore } from "@/stores/map-store";

import type { PlaybackEncounter } from "@/features/playback/types";
import { EncounterInfoCard } from "@/components/playback/EncounterInfoCard";
import { PlaybackControls } from "@/components/playback/PlaybackControls";

const MapPlayback = dynamic(
  () => import("@/components/playback/MapPlayback").then((m) => m.MapPlayback),
  { ssr: false }
);

export function PlaybackPageView({
  encounters,
  partners,
  selectedPartnerId,
  from,
  to,
}: {
  encounters: PlaybackEncounter[];
  partners: { id: string; nickname: string; is_default?: boolean | null }[];
  selectedPartnerId?: string;
  from?: string;
  to?: string;
}) {
  const t = useTranslations("playback");
  const router = useRouter();
  const { currentIndex, setCurrentIndex } = useMapStore();
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
  }, [setCurrentIndex]);

  const current = encounters[currentIndex];

  const handlePartnerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams();
    const val = e.target.value;
    if (val) params.set("partnerId", val);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/playback?${params.toString()}`);
  };

  const handleDateChange = (key: "from" | "to", value: string) => {
    const params = new URLSearchParams();
    if (selectedPartnerId) params.set("partnerId", selectedPartnerId);
    if (key === "from" && value) params.set("from", value);
    else if (key === "from") { /* omit */ }
    if (key === "to" && value) params.set("to", value);
    else if (key === "to") { /* omit */ }
    if (key === "from" && from) params.set("from", from);
    if (key === "to" && to) params.set("to", to);
    if (value) params.set(key, value);
    router.push(`/playback?${params.toString()}`);
  };

  if (!encounters.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
        <p className="text-[13px] text-muted">{t("noData")}</p>
        <button
          type="button"
          onClick={() => router.push("/playback")}
          className="rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-white"
        >
          {t("clearFilters")}
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapPlayback encounters={encounters} />

      {current && (
        <EncounterInfoCard
          encounter={current}
          currentIndex={currentIndex}
          total={encounters.length}
        />
      )}

      <PlaybackControls total={encounters.length} />

      {/* Top bar: back + title + filter */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex h-12 items-center justify-between gap-2 px-3 pt-[var(--safe-top)] md:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-content shadow-lg backdrop-blur-xl transition-colors hover:bg-surface/50 dark:bg-surface/80"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="pointer-events-auto flex items-center gap-2">
          <span className="text-sm font-semibold text-content drop-shadow-lg">
            {t("title")}
          </span>
          <span className="rounded-md bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-content/60 backdrop-blur-xl dark:bg-surface/80 dark:text-muted">
            {encounters.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="pointer-events-auto flex h-8 items-center gap-1 rounded-full bg-surface/90 px-2.5 text-[12px] font-medium text-content shadow-lg backdrop-blur-xl transition-colors hover:bg-surface/50 dark:bg-surface/80"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          <span className="hidden md:inline">{t("filter")}</span>
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="pointer-events-none absolute left-3 right-3 top-[calc(3.5rem+var(--safe-top))] z-20 md:left-auto md:right-6 md:w-72">
          <div className="pointer-events-auto rounded-2xl border border-border/5 bg-surface/95 p-4 shadow-xl backdrop-blur-2xl">
            <div className="mb-3 text-[13px] font-medium text-content">
              {t("filterTitle")}
            </div>

            <label className="mb-3 flex flex-col gap-1.5 text-[12px] text-content/60 dark:text-muted">
              {t("partner")}
              <select
                value={selectedPartnerId ?? ""}
                onChange={handlePartnerChange}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-content focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <option value="">{t("allPartners")}</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.nickname}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-[12px] text-content/60 dark:text-muted">
                {t("from")}
                <input
                  type="date"
                  value={from ?? ""}
                  onChange={(e) => handleDateChange("from", e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-content focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] text-content/60 dark:text-muted">
                {t("to")}
                <input
                  type="date"
                  value={to ?? ""}
                  onChange={(e) => handleDateChange("to", e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-[13px] text-content focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
