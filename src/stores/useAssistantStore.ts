import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageUri?: string | null;
  timestamp: string;
};

type AssistantStore = {
  messages: AssistantMessage[];
  addMessage: (msg: Omit<AssistantMessage, 'id'>) => void;
  clearMessages: () => void;
};

const WELCOME_MESSAGE: AssistantMessage = {
  id: 'welcome',
  role: 'assistant',
  text: "Hello! I'm your personal coin expert. Ask me anything about coins, their history, value, grading, or share a photo for analysis.",
  timestamp: new Date().toISOString(),
};

export const useAssistantStore = create<AssistantStore>()(
  persist(
    (set, get) => ({
      messages: [WELCOME_MESSAGE],
      addMessage: (msg) => {
        const newMsg: AssistantMessage = {
          ...msg,
          id: Date.now().toString() + Math.random().toString(36).slice(2),
        };
        set({ messages: [...get().messages, newMsg] });
      },
      clearMessages: () => {
        set({ messages: [WELCOME_MESSAGE] });
      },
    }),
    {
      name: 'assistant-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
