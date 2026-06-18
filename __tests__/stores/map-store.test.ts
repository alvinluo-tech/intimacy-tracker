import { describe, it, expect, beforeEach } from "vitest";
import { useMapStore } from "@/stores/map-store";

describe("useMapStore", () => {
  beforeEach(() => {
    useMapStore.setState({
      zoomLevel: "city",
      isPlaying: false,
      currentIndex: 0,
      playbackSpeed: 1,
    });
  });

  it("has correct initial state", () => {
    const state = useMapStore.getState();
    expect(state.zoomLevel).toBe("city");
    expect(state.isPlaying).toBe(false);
    expect(state.currentIndex).toBe(0);
    expect(state.playbackSpeed).toBe(1);
  });

  it("setZoomLevel updates zoomLevel", () => {
    useMapStore.getState().setZoomLevel("nation");
    expect(useMapStore.getState().zoomLevel).toBe("nation");

    useMapStore.getState().setZoomLevel("point");
    expect(useMapStore.getState().zoomLevel).toBe("point");
  });

  it("setIsPlaying toggles isPlaying", () => {
    useMapStore.getState().setIsPlaying(true);
    expect(useMapStore.getState().isPlaying).toBe(true);

    useMapStore.getState().setIsPlaying(false);
    expect(useMapStore.getState().isPlaying).toBe(false);
  });

  it("setCurrentIndex updates currentIndex", () => {
    useMapStore.getState().setCurrentIndex(5);
    expect(useMapStore.getState().currentIndex).toBe(5);
  });

  it("setPlaybackSpeed updates playbackSpeed", () => {
    useMapStore.getState().setPlaybackSpeed(2);
    expect(useMapStore.getState().playbackSpeed).toBe(2);
  });
});
