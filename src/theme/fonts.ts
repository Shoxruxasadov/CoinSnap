import { Platform } from 'react-native';

/**
 * iOS: SF Pro (tizim default shrifti — fontFamily bermasak ishlatiladi).
 * Android: Inter (@expo-google-fonts/inter orqali yuklanadi).
 */
const isIOS = Platform.OS === 'ios';

export const fonts = {
  /** Regular — iOS: SF Pro, Android: Inter */
  regular: isIOS ? undefined : 'Inter_400Regular',
  /** Medium (500) — iOS: SF Pro, Android: Inter */
  medium: isIOS ? undefined : 'Inter_500Medium',
  /** SemiBold (600) — iOS: SF Pro, Android: Inter */
  semiBold: isIOS ? undefined : 'Inter_600SemiBold',
  /** Bold (700) — iOS: SF Pro, Android: Inter */
  bold: isIOS ? undefined : 'Inter_700Bold',
} as const;
