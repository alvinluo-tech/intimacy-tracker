import { create } from "zustand";

interface TimerStore {
  isOpen: boolean;
  setOpen: (val: boolean) => void;
  recordedDuration: number | null;
  setRecordedDuration: (val: number | null) => void;
}

export const useTimerStore = create<TimerStore>((set) => ({
  isOpen: false,
  setOpen: (val) => set({ isOpen: val }),
  recordedDuration: null,
  setRecordedDuration: (val) => set({ recordedDuration: val }),
}));