import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

function isVibrationEnabled(): boolean {
  return useSettingsStore.getState().vibration;
}

export function triggerSelection(): void {
  if (!isVibrationEnabled()) return;
  try {
    Haptics.selectionAsync();
  } catch {
    //
  }
}

export function triggerLight(): void {
  if (!isVibrationEnabled()) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    //
  }
}

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
