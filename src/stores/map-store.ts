"use client";

import { create } from "zustand";

export type ZoomLevel = "nation" | "city" | "point";

interface MapStore {
  zoomLevel: ZoomLevel;
  isPlaying: boolean;
  currentIndex: number;
  playbackSpeed: number;
  setZoomLevel: (level: ZoomLevel) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentIndex: (index: number) => void;
  setPlaybackSpeed: (speed: number) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  zoomLevel: "city",
  isPlaying: false,
  currentIndex: 0,
  playbackSpeed: 1,
  setZoomLevel: (level) => set({ zoomLevel: level }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
}));
