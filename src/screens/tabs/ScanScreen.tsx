import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../theme/useThemeColors';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, backgroundColor: colors.background.bgBase }]}>
      <Text style={[styles.title, { color: colors.text.textBase }]}>Scan</Text>
      <Text style={[styles.hint, { color: colors.text.textAlt }]}>Camera scan will open here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  hint: {
    fontSize: 14,
    marginTop: 8,
  },
});
