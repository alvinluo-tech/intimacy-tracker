import { create } from "zustand";

interface TimerStore {
  isOpen: boolean;
  setOpen: (val: boolean) => void;
  recordedDuration: number | null; // Keep this as minutes for backward compatibility/form default, or change semantics
  recordedStartTime: Date | null;
  setRecordedData: (durationMinutes: number | null, startTime: Date | null) => void;
}

export const useTimerStore = create<TimerStore>((set) => ({
  isOpen: false,
  setOpen: (val) => set({ isOpen: val }),
  recordedDuration: null,
  recordedStartTime: null,
  setRecordedData: (durationMinutes, startTime) => set({ recordedDuration: durationMinutes, recordedStartTime: startTime }),
}));