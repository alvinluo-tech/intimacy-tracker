import { describe, it, expect, beforeEach } from "vitest";
import { useTimerStore } from "@/stores/timer-store";

describe("useTimerStore", () => {
  beforeEach(() => {
    useTimerStore.setState({
      isOpen: false,
      recordedDuration: null,
      recordedStartTime: null,
      recordedEndTime: null,
    });
  });

  it("has correct initial state", () => {
    const state = useTimerStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.recordedDuration).toBeNull();
    expect(state.recordedStartTime).toBeNull();
    expect(state.recordedEndTime).toBeNull();
  });

  it("setOpen toggles isOpen", () => {
    useTimerStore.getState().setOpen(true);
    expect(useTimerStore.getState().isOpen).toBe(true);

    useTimerStore.getState().setOpen(false);
    expect(useTimerStore.getState().isOpen).toBe(false);
  });

  it("setRecordedData updates all recorded fields", () => {
    const startTime = new Date("2025-06-15T10:00:00Z");
    const endTime = new Date("2025-06-15T10:30:00Z");

    useTimerStore.getState().setRecordedData(30, startTime, endTime);
    const state = useTimerStore.getState();

    expect(state.recordedDuration).toBe(30);
    expect(state.recordedStartTime).toBe(startTime);
    expect(state.recordedEndTime).toBe(endTime);
  });

  it("setRecordedData accepts null values", () => {
    useTimerStore.getState().setRecordedData(null, null, null);
    const state = useTimerStore.getState();

    expect(state.recordedDuration).toBeNull();
    expect(state.recordedStartTime).toBeNull();
    expect(state.recordedEndTime).toBeNull();
  });
});
