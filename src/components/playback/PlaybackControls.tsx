"use client";

import { useTranslations } from "next-intl";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { useMapStore, type ZoomLevel } from "@/stores/map-store";

const ZOOM_LEVELS: ZoomLevel[] = ["nation", "city", "point"];

export function PlaybackControls({ total }: { total: number }) {
  const t = useTranslations("playback");

  const {
    currentIndex,
    isPlaying,
    playbackSpeed,
    zoomLevel,
    setCurrentIndex,
    setIsPlaying,
    setPlaybackSpeed,
    setZoomLevel,
  } = useMapStore();

  const canSkipBack = currentIndex > 0;
  const canSkipForward = currentIndex < total - 1;
  const canSkipFirst = currentIndex > 0;
  const canSkipLast = currentIndex < total - 1;

  const handlePlayPause = () => {
    if (currentIndex >= total - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    if (canSkipBack) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(false);
    }
  };

  const handleSkipForward = () => {
    if (canSkipForward) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const cycleSpeed = () => {
    const speeds = [0.5, 1, 2];
    const idx = speeds.indexOf(playbackSpeed);
    setPlaybackSpeed(speeds[(idx + 1) % speeds.length]);
  };

  const cycleZoom = () => {
    const idx = ZOOM_LEVELS.indexOf(zoomLevel);
    setZoomLevel(ZOOM_LEVELS[(idx + 1) % ZOOM_LEVELS.length]);
  };

  return (
    <div className="absolute bottom-[max(0.75rem,var(--safe-bottom))] left-1/2 z-10 w-[calc(100%-1.5rem)] -translate-x-1/2 md:bottom-6 md:w-auto">
      <div className="flex items-center justify-center gap-1 rounded-2xl border border-border/5 bg-surface/80 px-2 py-1.5 shadow-lg backdrop-blur-xl md:gap-1.5 md:px-3 md:py-2">
        {/* Zoom toggle */}
        <button
          type="button"
          onClick={cycleZoom}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:text-content"
          title={t("zoomLevel")}
        >
          {zoomLevel === "nation" ? (
            <ZoomOut className="h-4 w-4" />
          ) : zoomLevel === "point" ? (
            <ZoomIn className="h-4 w-4" />
          ) : (
            <ZoomIn className="h-4 w-4" />
          )}
        </button>

        <div className="mx-1 h-6 w-px bg-border/50" />

        {/* First */}
        <button
          type="button"
          onClick={() => { setCurrentIndex(0); setIsPlaying(false); }}
          disabled={!canSkipFirst}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors enabled:hover:text-content disabled:opacity-30"
          title={t("skipFirst")}
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* Previous */}
        <button
          type="button"
          onClick={handleSkipBack}
          disabled={!canSkipBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors enabled:hover:text-content disabled:opacity-30"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        {/* Play / Pause */}
        <button
          type="button"
          onClick={handlePlayPause}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary/90"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>

        {/* Next */}
        <button
          type="button"
          onClick={handleSkipForward}
          disabled={!canSkipForward}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors enabled:hover:text-content disabled:opacity-30"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        {/* Last */}
        <button
          type="button"
          onClick={() => { setCurrentIndex(total - 1); setIsPlaying(false); }}
          disabled={!canSkipLast}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors enabled:hover:text-content disabled:opacity-30"
          title={t("skipLast")}
        >
          <ChevronsRight className="h-4 w-4" />
        </button>

        <div className="mx-1 h-6 w-px bg-border/50" />

        {/* Speed toggle */}
        <button
          type="button"
          onClick={cycleSpeed}
          className="flex h-8 items-center justify-center rounded-lg px-2 font-mono text-[11px] font-medium text-muted transition-colors hover:text-content"
        >
          {playbackSpeed}x
        </button>

        {/* Reset */}
        <button
          type="button"
          onClick={handleReset}
          disabled={currentIndex === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors enabled:hover:text-content disabled:opacity-30"
          title={t("reset")}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-1.5 px-1 md:mt-2 md:px-2">
        <input
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={currentIndex}
          onChange={(e) => {
            setCurrentIndex(Number(e.target.value));
            setIsPlaying(false);
          }}
          className="playback-slider h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none md:h-1"
          aria-label={t("progress")}
          style={{
            background: `linear-gradient(to right, #f43f5e 0%, #f43f5e ${total > 1 ? (currentIndex / (total - 1)) * 100 : 100}%, rgba(148,163,184,0.25) ${total > 1 ? (currentIndex / (total - 1)) * 100 : 100}%, rgba(148,163,184,0.25) 100%)`,
          }}
        />
      </div>
    </div>
  );
}
