import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '../lib/safeStorage';

interface SettingsState {
  vibration: boolean;
  setVibration: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      vibration: true,
      setVibration: (value) => set({ vibration: value }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
