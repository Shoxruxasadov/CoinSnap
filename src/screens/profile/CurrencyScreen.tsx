import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Search, Check } from 'lucide-react-native';
import { useThemeColors } from '../../theme/useThemeColors';
import { useSettingsStore } from '../../store/settingsStore';
import { triggerSelection } from '../../lib/haptics';

const CURRENCIES = [
  { code: 'USD', name: 'American Dollar', symbol: '$' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'Pound Sterling', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CNY', name: 'Chinese Yuan (Renminbi)', symbol: '元' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
];

export default function CurrencyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const currency = useSettingsStore((s) => s.currency);
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const [search, setSearch] = useState('');

  const handleBack = () => {
    triggerSelection();
    navigation.goBack();
  };

  const handleSelect = (code: string) => {
    triggerSelection();
    setCurrency(code);
  };

  const filtered = CURRENCIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgAlt }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <ChevronLeft size={28} color={colors.text.textBase} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.textBase }]}>Currency</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface.onBgAlt }]}>
          <Search size={20} color={colors.text.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.textBase }]}
            placeholder="Search for currency"
            placeholderTextColor={colors.text.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.map((c, idx) => (
          <TouchableOpacity
            key={c.code}
            style={[
              styles.currencyRow,
              idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border.border2 },
            ]}
            onPress={() => handleSelect(c.code)}
            activeOpacity={0.7}
          >
            <Text style={[styles.currencyText, { color: colors.text.textBase }]}>
              {c.name}  -  {c.symbol}
            </Text>
            {currency === c.code && <Check size={22} color={colors.text.textAlt} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 44,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
