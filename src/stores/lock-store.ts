"use client";

import { create } from "zustand";

type LockState = {
  unlocked: boolean;
  unlock: () => void;
  lock: () => void;
};

export const useLockStore = create<LockState>((set) => ({
  unlocked: false,
  unlock: () => set({ unlocked: true }),
  lock: () => set({ unlocked: false }),
}));
