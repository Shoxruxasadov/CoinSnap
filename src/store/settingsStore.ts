import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '../lib/safeStorage';

export type ThemeMode = 'system' | 'light' | 'dark';

interface SettingsState {
  vibration: boolean;
  setVibration: (value: boolean) => void;
  currency: string;
  setCurrency: (value: string) => void;
  language: string;
  setLanguage: (value: string) => void;
  themeMode: ThemeMode;
  setThemeMode: (value: ThemeMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      vibration: true,
      setVibration: (value) => set({ vibration: value }),
      currency: 'USD',
      setCurrency: (value) => set({ currency: value }),
      language: 'en',
      setLanguage: (value) => set({ language: value }),
      themeMode: 'system',
      setThemeMode: (value) => set({ themeMode: value }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
