"use client";

import { useTranslations } from "next-intl";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
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
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 md:bottom-6">
      <div className="flex items-center gap-1.5 rounded-2xl border border-border/5 bg-surface/80 px-3 py-2 shadow-lg backdrop-blur-xl">
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
      <div className="mt-2 px-2">
        <input
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={currentIndex}
          onChange={(e) => {
            setCurrentIndex(Number(e.target.value));
            setIsPlaying(false);
          }}
          className="playback-slider h-1 w-full cursor-pointer appearance-none rounded-full bg-border/50 outline-none"
          aria-label={t("progress")}
        />
      </div>
    </div>
  );
}
