import { useColorScheme } from 'react-native';
import { colorTokens } from './colors';

export function useThemeColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? colorTokens.dark : colorTokens.light;
}
