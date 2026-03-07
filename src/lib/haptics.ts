import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

function isVibrationEnabled(): boolean {
  return useSettingsStore.getState().vibration;
}

/** Tab va boshqa yengil tanlash (selection) uchun */
export function triggerSelection(): void {
  if (!isVibrationEnabled()) return;
  try {
    Haptics.selectionAsync();
  } catch {
    // simulator / qurilma qo‘llab-quvvatlamasa
  }
}

/** Sahifa o‘zgarishi, tugma bosish va h.k. uchun impact. Android da durationMs (ms). */
export function triggerImpact(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium,
  durationMs?: number
): void {
  if (!isVibrationEnabled()) return;
  if (Platform.OS === 'android') {
    try {
      Vibration.vibrate(durationMs ?? 50);
    } catch {
      //
    }
  } else {
    try {
      Haptics.impactAsync(style);
    } catch {
      //
    }
  }
}
