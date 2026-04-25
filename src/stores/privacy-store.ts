import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PrivacyStore {
  blurEnabled: boolean;
  toggleBlur: () => void;
}

export const usePrivacyStore = create<PrivacyStore>()(
  persist(
    (set) => ({
      blurEnabled: false,
      toggleBlur: () => set((state) => ({ blurEnabled: !state.blurEnabled })),
    }),
    {
      name: "privacy-storage",
    }
  )
);