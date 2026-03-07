import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { ChevronLeft, MoreHorizontal, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainStack';
import { useThemeColors } from '../theme/useThemeColors';
import { triggerSelection } from '../lib/haptics';
import { supabase } from '../lib/supabase';
import { useSupabaseSession } from '../lib/useSupabaseSession';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'ScanResult'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type CoinData = {
  id: number;
  name: string;
  country: string;
  year_start: number | null;
  year_end: number | null;
  front_image_url: string | null;
  back_image_url: string | null;
  mintage: number | null;
  composition: string | null;
  estimated_price_min: number | null;
  estimated_price_max: number | null;
  grade_label: string | null;
  grade_value: number | null;
  denomination: string | null;
  metal_composition_detailed: string | null;
  weight_grams: number | null;
  diameter_mm: number | null;
  thickness_mm: number | null;
  edge_type: string | null;
  designer: string | null;
  history_description: string | null;
  ai_opinion: string | null;
  dimension_illustration_url: string | null;
};

const GRADE_MARKS = [1, 4, 12, 20, 30, 45, 60, 70];

const TAB_KEYS = ['Details', 'Dimensions', 'History', 'Products'] as const;
type TabKey = (typeof TAB_KEYS)[number];

function formatYear(start: number | null, end: number | null): string {
  if (start && end && start !== end) return `${start} ~ ${end}`;
  if (start) return `${start}`;
  if (end) return `${end}`;
  return '';
}

function formatMintage(m: number | null): string {
  if (!m) return '-';
  return m.toLocaleString();
}

function formatPrice(min: number | null, max: number | null): string {
  if (min != null && max != null) return `$${min.toFixed(2)} - $${max.toFixed(2)}`;
  if (min != null) return `$${min.toFixed(2)}`;
  if (max != null) return `$${max.toFixed(2)}`;
  return '-';
}

function GradeScale({ value, label }: { value: number | null; label: string | null }) {
  const position = value ? Math.min(Math.max((value / 70) * 100, 2), 98) : 0;

  return (
    <View style={gradeStyles.container}>
      <View style={gradeStyles.headerRow}>
        <View>
          <Text style={gradeStyles.headerLabel}>Coin Grading</Text>
        </View>
        <View style={gradeStyles.gradeValuePill}>
          <Text style={gradeStyles.gradeValueLabel}>{label || '-'}</Text>
          <Text style={gradeStyles.gradeValueNum}>({value ?? '-'})</Text>
          <View style={gradeStyles.gradeDot} />
        </View>
      </View>
      <View style={gradeStyles.scaleBar}>
        <View style={gradeStyles.scaleFill} />
        {value != null && (
          <View style={[gradeStyles.scaleMarker, { left: `${position}%` }]}>
            <View style={gradeStyles.scaleMarkerDot} />
          </View>
        )}
      </View>
      <View style={gradeStyles.scaleLabels}>
        {GRADE_MARKS.map((m) => (
          <Text key={m} style={gradeStyles.scaleLabelText}>
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
}

function SpecRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={specStyles.row}>
      <Text style={specStyles.label}>{label}:</Text>
      <Text style={specStyles.value}>{value || '-'}</Text>
    </View>
  );
}

export default function ScanResultScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const coin: CoinData = route.params.coin;
  const { session } = useSupabaseSession();
  const userId = session?.user?.id;

  const [activeTab, setActiveTab] = useState<TabKey>('Details');
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const handleBack = () => {
    triggerSelection();
    navigation.goBack();
  };

  const handleAddToCollection = async () => {
    triggerSelection();
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to add coins to your collection.');
      return;
    }

    const { data: collections, error } = await supabase
      .from('collections')
      .select('id, name, coin_ids')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !collections || collections.length === 0) {
      Alert.alert('No collections', 'Create a collection first to add coins.');
      return;
    }

    if (collections.length === 1) {
      const col = collections[0];
      const newIds = [...(col.coin_ids || []), coin.id];
      await supabase
        .from('collections')
        .update({ coin_ids: newIds, updated_at: new Date().toISOString() })
        .eq('id', col.id);
      Alert.alert('Added', `Coin added to "${col.name}"`);
      return;
    }

    const buttons = collections.slice(0, 5).map((col) => ({
      text: col.name,
      onPress: async () => {
        const newIds = [...(col.coin_ids || []), coin.id];
        await supabase
          .from('collections')
          .update({ coin_ids: newIds, updated_at: new Date().toISOString() })
          .eq('id', col.id);
        Alert.alert('Added', `Coin added to "${col.name}"`);
      },
    }));
    buttons.push({ text: 'Cancel', onPress: async () => {} });

    Alert.alert('Choose Collection', 'Select a collection to add this coin to:', buttons as any);
  };

  const yearStr = formatYear(coin.year_start, coin.year_end);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Details':
        return (
          <View style={tabStyles.section}>
            <Text style={[tabStyles.sectionTitle, { color: colors.text.textBase }]}>Specifications</Text>
            <SpecRow label="Denomination" value={coin.denomination} />
            <SpecRow label="Metal" value={coin.metal_composition_detailed} />
            <SpecRow label="Weight" value={coin.weight_grams ? `${coin.weight_grams} grams` : null} />
            <SpecRow label="Diameter" value={coin.diameter_mm ? `${coin.diameter_mm} mm` : null} />
            <SpecRow label="Thickness" value={coin.thickness_mm ? `~${coin.thickness_mm} mm` : null} />
            <SpecRow label="Edge" value={coin.edge_type} />
          </View>
        );
      case 'Dimensions':
        return (
          <View style={tabStyles.section}>
            <Text style={[tabStyles.sectionTitle, { color: colors.text.textBase }]}>Dimensions</Text>
            <View style={tabStyles.dimensionsCard}>
              <View style={tabStyles.dimRow}>
                <Text style={tabStyles.dimLabel}>Weight:</Text>
                <Text style={tabStyles.dimValue}>{coin.weight_grams ? `${coin.weight_grams} grams` : '-'}</Text>
              </View>
              <View style={tabStyles.dimRow}>
                <Text style={tabStyles.dimLabel}>Diameter:</Text>
                <Text style={tabStyles.dimValue}>{coin.diameter_mm ? `${coin.diameter_mm} mm` : '-'}</Text>
              </View>
              <View style={tabStyles.dimRow}>
                <Text style={tabStyles.dimLabel}>Thickness:</Text>
                <Text style={tabStyles.dimValue}>{coin.thickness_mm ? `~${coin.thickness_mm} mm` : '-'}</Text>
              </View>
              {coin.back_image_url && (
                <Image
                  source={{ uri: coin.back_image_url }}
                  style={tabStyles.dimIllustration}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>
        );
      case 'History':
        return (
          <View style={tabStyles.section}>
            <Text style={[tabStyles.sectionTitle, { color: colors.text.textBase }]}>History</Text>
            <Text
              style={[tabStyles.historyText, { color: colors.text.textBase }]}
              numberOfLines={historyExpanded ? undefined : 5}
            >
              {coin.history_description || 'No history available.'}
            </Text>
            {coin.history_description && coin.history_description.length > 200 && (
              <TouchableOpacity onPress={() => setHistoryExpanded(!historyExpanded)}>
                <Text style={[tabStyles.moreBtn, { color: colors.text.textBrand }]}>
                  {historyExpanded ? 'Less' : 'More'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      case 'Products':
        return (
          <View style={tabStyles.section}>
            <Text style={[tabStyles.sectionTitle, { color: colors.text.textBase }]}>
              Similar Products from Ebay
            </Text>
            <View style={tabStyles.productsPlaceholder}>
              <Text style={{ color: colors.text.textTertiary, fontSize: 14, textAlign: 'center' }}>
                eBay product listings will appear here
              </Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.bgBase }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.background.bgAlt }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
          <ChevronLeft size={28} color={colors.text.textBase} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.textBase }]}>Result</Text>
        <TouchableOpacity style={styles.headerBtn}>
          <MoreHorizontal size={24} color={colors.text.textBase} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Coin images */}
        <View style={styles.coinImagesRow}>
          {coin.front_image_url && (
            <Image source={{ uri: coin.front_image_url }} style={styles.coinImage} />
          )}
          {coin.back_image_url && (
            <Image source={{ uri: coin.back_image_url }} style={styles.coinImage} />
          )}
        </View>

        {/* Title */}
        <Text style={[styles.coinName, { color: colors.text.textBase }]}>{coin.name}</Text>
        <Text style={[styles.coinOrigin, { color: colors.text.textAlt }]}>
          {coin.country}{yearStr ? `, ${yearStr}` : ''}
        </Text>

        {/* Mintage + Composition */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.background.bgAlt }]}>
            <Text style={[styles.statValue, { color: colors.text.textBase }]}>
              {formatMintage(coin.mintage)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.textAlt }]}>Mintage</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.background.bgAlt }]}>
            <Text style={[styles.statValue, { color: colors.text.textBase }]}>
              {coin.composition || '-'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text.textAlt }]}>Composition</Text>
          </View>
        </View>

        {/* Price */}
        <View style={[styles.priceSection, { borderColor: colors.border.border3 }]}>
          <Text style={[styles.priceText, { color: colors.text.textBase }]}>
            {formatPrice(coin.estimated_price_min, coin.estimated_price_max)}
          </Text>
          <Text style={[styles.priceSubtext, { color: colors.text.textAlt }]}>
            Price depends on eBay
          </Text>
        </View>

        {/* Grade scale */}
        <GradeScale value={coin.grade_value} label={coin.grade_label} />

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {TAB_KEYS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: colors.text.textBrand, borderBottomWidth: 2 },
              ]}
              onPress={() => {
                triggerSelection();
                setActiveTab(tab);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? colors.text.textBase : colors.text.textAlt },
                  activeTab === tab && { fontWeight: '700' },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {renderTabContent()}

        {/* AI Opinion */}
        {coin.ai_opinion && (
          <View style={[styles.aiCard, { backgroundColor: colors.state.orangeLightElevated || '#FFF8EC' }]}>
            <Text style={[styles.aiTitle, { color: colors.text.textBrand }]}>AI Opinion</Text>
            <Text style={[styles.aiText, { color: colors.text.textBase }]}>{coin.ai_opinion}</Text>
          </View>
        )}

        {/* eBay placeholder */}
        {activeTab !== 'Products' && (
          <View style={styles.ebaySection}>
            <Text style={[styles.ebaySectionTitle, { color: colors.text.textBase }]}>
              Similar Products from Ebay
            </Text>
            <View style={tabStyles.productsPlaceholder}>
              <Text style={{ color: colors.text.textTertiary, fontSize: 14, textAlign: 'center' }}>
                eBay product listings will appear here
              </Text>
            </View>
          </View>
        )}

        {/* Disclaimer */}
        <Text style={[styles.disclaimer, { color: colors.text.textTertiary }]}>
          This content generated by Artificial Intelligence
        </Text>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCta, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background.bgBase }]}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.background.brand }]}
          onPress={handleAddToCollection}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>Add to Collection</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  coinImagesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  coinImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  coinName: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  coinOrigin: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },

  priceSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  priceText: { fontSize: 24, fontWeight: '800' },
  priceSubtext: { fontSize: 12, marginTop: 2 },

  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 10,
  },
  tabText: { fontSize: 14 },

  aiCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 16,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  aiText: {
    fontSize: 14,
    lineHeight: 22,
  },

  ebaySection: {
    marginTop: 20,
  },
  ebaySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },

  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },

  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  addBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});

const gradeStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLabel: { fontSize: 14, color: '#666' },
  gradeValuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gradeValueLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  gradeValueNum: { fontSize: 14, color: '#333' },
  gradeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DFAC4C',
  },
  scaleBar: {
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    marginBottom: 6,
    position: 'relative',
    overflow: 'visible',
  },
  scaleFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 6,
    backgroundColor: '#DFAC4C',
    borderRadius: 3,
    width: '100%',
  },
  scaleMarker: {
    position: 'absolute',
    top: -5,
    marginLeft: -8,
  },
  scaleMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DFAC4C',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabelText: { fontSize: 11, color: '#999' },
});

const specStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 14, color: '#333', fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 16 },
});

const tabStyles = StyleSheet.create({
  section: { minHeight: 100 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  dimensionsCard: { paddingBottom: 16 },
  dimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  dimLabel: { fontSize: 14, color: '#666' },
  dimValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  dimIllustration: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  historyText: { fontSize: 14, lineHeight: 22 },
  moreBtn: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  productsPlaceholder: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
