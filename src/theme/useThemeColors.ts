import { useColorScheme } from 'react-native';
import { colorTokens } from './colors';
import { useSettingsStore } from '../store/settingsStore';

export function useThemeColors() {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);

  const effectiveScheme =
    themeMode === 'system' ? systemScheme : themeMode;

  return effectiveScheme === 'dark' ? colorTokens.dark : colorTokens.light;
}

export function useEffectiveColorScheme(): 'light' | 'dark' {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);

  if (themeMode === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return themeMode;
}
