import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '../lib/safeStorage';

interface AuthState {
  isSkipped: boolean;
  setSkipped: () => void;
  resetSkipped: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isSkipped: false,
      setSkipped: () => set({ isSkipped: true }),
      resetSkipped: () => set({ isSkipped: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
