import { create } from "zustand";

interface TimerStore {
  isOpen: boolean;
  setOpen: (val: boolean) => void;
  recordedDuration: number | null; // Keep this as minutes for backward compatibility/form default, or change semantics
  recordedStartTime: Date | null;
  recordedEndTime: Date | null;
  setRecordedData: (durationMinutes: number | null, startTime: Date | null, endTime: Date | null) => void;
}

export const useTimerStore = create<TimerStore>((set) => ({
  isOpen: false,
  setOpen: (val) => set({ isOpen: val }),
  recordedDuration: null,
  recordedStartTime: null,
  recordedEndTime: null,
  setRecordedData: (durationMinutes, startTime, endTime) => set({ recordedDuration: durationMinutes, recordedStartTime: startTime, recordedEndTime: endTime }),
}));