import { create } from 'zustand';

interface AuthState {
  hasCompletedAuthFlow: boolean;
  setAuthComplete: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  hasCompletedAuthFlow: false,
  setAuthComplete: () => set({ hasCompletedAuthFlow: true }),
}));
