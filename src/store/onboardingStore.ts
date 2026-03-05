import { create } from 'zustand';

interface OnboardingState {
  hasSeenOnboarding: boolean;
  completeOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasSeenOnboarding: false,
  completeOnboarding: () => set({ hasSeenOnboarding: true }),
}));
