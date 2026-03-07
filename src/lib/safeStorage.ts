/**
 * Storage adapter that falls back to in-memory when AsyncStorage native module is null
 * (e.g. in Expo Go or before native modules are ready).
 */

const memory: Record<string, string> = {};

async function safeGetItem(key: string): Promise<string | null> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem(key);
  } catch {
    return memory[key] ?? null;
  }
}

async function safeSetItem(key: string, value: string): Promise<void> {
  memory[key] = value;
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(key, value);
  } catch {
    // persist in memory only
  }
}

async function safeRemoveItem(key: string): Promise<void> {
  delete memory[key];
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem(key);
  } catch {
    // already removed from memory
  }
}

export const safeStorage = {
  getItem: safeGetItem,
  setItem: safeSetItem,
  removeItem: safeRemoveItem,
};

export default safeStorage;
