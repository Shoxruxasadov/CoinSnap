import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { ChevronLeft, LayoutGrid, List } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useThemeColors } from '../theme/useThemeColors';
import { supabase } from '../lib/supabase';
import type { MainStackParamList } from '../navigation/MainStack';
import type { CollectionRow } from './tabs/CollectionsScreen';
import FolderEmptyIcon from '../../assets/empty/folder.svg';

const CARD_HEIGHT = 96;

export type CollectionCoinRow = {
  id: number;
  name: string;
  country: string;
  year_start: number | null;
  year_end: number | null;
  front_image_url: string | null;
  back_image_url: string | null;
  estimated_price_min: number | null;
  estimated_price_max: number | null;
  scanned_at: string | null;
  created_at: string;
};

type ViewMode = 'list' | 'card';
type CollectionDetailRoute = RouteProp<MainStackParamList, 'CollectionDetail'>;

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return '';
  }
}

function formatPriceRange(min: number | null, max: number | null): string {
  if (min != null && max != null) return `$${min}-$${max}`;
  if (min != null) return `$${min}`;
  if (max != null) return `$${max}`;
  return '';
}

function CoinRowList({
  item,
  colors,
}: {
  item: CollectionCoinRow;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const displayName = [item.name, item.country, item.year_start ?? item.year_end].filter(Boolean).join(' ').trim() || item.name;
  const priceText = formatPriceRange(item.estimated_price_min, item.estimated_price_max);
  const hasFront = !!item.front_image_url;
  const hasBack = !!item.back_image_url;
  const dateStr = formatDate(item.scanned_at ?? item.created_at);

  return (
    <TouchableOpacity
      style={[styles.coinCard, { backgroundColor: colors.surface.onBgBase }]}
      activeOpacity={1}
    >
      <View style={[styles.coinImagesWrap, { backgroundColor: colors.surface.onBgAlt }]}>
        {hasFront && (
          <View style={styles.coinImageBack}>
            <Image source={{ uri: item.front_image_url! }} style={styles.coinCircleImage} resizeMode="cover" />
          </View>
        )}
        {hasBack && (
          <View style={styles.coinImageFront}>
            <Image source={{ uri: item.back_image_url! }} style={styles.coinCircleImage} resizeMode="cover" />
          </View>
        )}
        {!hasFront && !hasBack && (
          <View style={[styles.coinImagePlaceholder, { backgroundColor: colors.surface.onBgAlt }]} />
        )}
      </View>
      <View style={styles.coinInfo}>
        <Text style={[styles.coinName, { color: colors.text.textBase }]} numberOfLines={1} ellipsizeMode="tail">
          {displayName}
        </Text>
        <View style={styles.coinMetaRow}>
          <Text style={[styles.coinDate, { color: colors.text.textTertiary }]}>{dateStr}</Text>
          {priceText ? (
            <Text style={[styles.coinPrice, { color: colors.text.textBrand }]} numberOfLines={1}>
              {priceText}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CoinCardGrid({
  item,
  colors,
}: {
  item: CollectionCoinRow;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const displayName = [item.name, item.country, item.year_start ?? item.year_end].filter(Boolean).join(' ').trim() || item.name;
  const priceText = formatPriceRange(item.estimated_price_min, item.estimated_price_max);
  const imgUrl = item.front_image_url ?? item.back_image_url;

  return (
    <View style={[styles.coinCardGrid, { backgroundColor: colors.surface.onBgBase }]}>
      <View style={[styles.coinCardGridImageWrap, { backgroundColor: colors.surface.onBgAlt }]}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.coinCardGridImage} resizeMode="cover" />
        ) : (
          <View style={[styles.coinCardGridImage, { backgroundColor: colors.border.border3 }]} />
        )}
      </View>
      <Text style={[styles.coinCardGridName, { color: colors.text.textBase }]} numberOfLines={2} ellipsizeMode="tail">
        {displayName}
      </Text>
      {priceText ? (
        <Text style={[styles.coinCardGridPrice, { color: colors.text.textBrand }]} numberOfLines={1}>
          {priceText}
        </Text>
      ) : null}
    </View>
  );
}

export default function CollectionDetailScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const route = useRoute<CollectionDetailRoute>();
  const navigation = useNavigation();
  const collection = route.params?.collection;

  const [coins, setCoins] = useState<CollectionCoinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const coinIds = collection?.coin_ids ?? [];
  const orderedCoins = useMemo(() => {
    const byId: Record<number, CollectionCoinRow> = {};
    coins.forEach((c) => { byId[c.id] = c; });
    return coinIds.map((id) => byId[id]).filter(Boolean);
  }, [coins, coinIds.join(',')]);

  const summary = useMemo(() => {
    let total = 0;
    let minVal: number | null = null;
    let maxVal: number | null = null;
    orderedCoins.forEach((c) => {
      const lo = c.estimated_price_min ?? c.estimated_price_max ?? null;
      const hi = c.estimated_price_max ?? c.estimated_price_min ?? null;
      const mid = lo != null && hi != null ? (lo + hi) / 2 : lo ?? hi ?? 0;
      total += mid;
      if (lo != null && (minVal == null || lo < minVal)) minVal = lo;
      if (hi != null && (maxVal == null || hi > maxVal)) maxVal = hi;
    });
    return { total, lowest: minVal, highest: maxVal };
  }, [orderedCoins]);

  useEffect(() => {
    if (!collection || coinIds.length === 0) {
      setCoins([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('coins')
      .select('id, name, country, year_start, year_end, front_image_url, back_image_url, estimated_price_min, estimated_price_max, scanned_at, created_at')
      .in('id', coinIds)
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (error) {
          setCoins([]);
          return;
        }
        setCoins((data as CollectionCoinRow[]) ?? []);
      });
    return () => { cancelled = true; };
  }, [collection?.id, coinIds.join(',')]);

  if (!collection) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgBase }]}>
        <Text style={[styles.placeholder, { color: colors.text.textTertiary }]}>Collection not found.</Text>
      </View>
    );
  }

  const isList = viewMode === 'list';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgBase }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.border2 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <ChevronLeft size={24} color={colors.text.textBase} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.textBase }]} numberOfLines={1} ellipsizeMode="tail">
          {collection.name}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setViewMode('card')}
          >
            <LayoutGrid size={22} color={!isList ? colors.text.textBrand : colors.text.textAlt} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setViewMode('list')}
          >
            <List size={22} color={isList ? colors.text.textBrand : colors.text.textAlt} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.text.textBrand} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
            orderedCoins.length === 0
              ? { flexGrow: 1, minHeight: Dimensions.get('window').height - insets.top - 56 }
              : null,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {orderedCoins.length > 0 && (
            <>
              <View style={[styles.summaryCard, { backgroundColor: colors.surface.onBgBase }]}>
                <Text style={[styles.summaryLabel, { color: colors.text.textTertiary }]}>Total collection value</Text>
                <Text style={[styles.summaryTotal, { color: colors.text.textBrand }]}>
                  ${Math.round(summary.total)}
                </Text>
                <View style={styles.summaryRow}>
                  <View style={[styles.summaryBox, { backgroundColor: colors.background.bgBase }]}>
                    <Text style={[styles.summaryBoxLabel, { color: colors.text.textTertiary }]}>Lowest Coin</Text>
                    <Text style={[styles.summaryBoxValue, { color: colors.text.textBase }]}>
                      {summary.lowest != null ? `$${summary.lowest}` : '—'}
                    </Text>
                  </View>
                  <View style={[styles.summaryBox, { backgroundColor: colors.background.bgBase }]}>
                    <Text style={[styles.summaryBoxLabel, { color: colors.text.textTertiary }]}>Highest Coin</Text>
                    <Text style={[styles.summaryBoxValue, { color: colors.text.textBase }]}>
                      {summary.highest != null ? `$${summary.highest}` : '—'}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.itemsTitle, { color: colors.text.textBase }]}>Items</Text>
            </>
          )}

          {orderedCoins.length === 0 ? (
            <View style={[styles.emptyWrap, styles.emptyWrapCentered]}>
              <FolderEmptyIcon width={73} height={64} />
              <Text style={[styles.emptyTitle, { color: colors.text.textTertiary }]}>
                You didn't added any coins to this collection
              </Text>
            </View>
          ) : isList ? (
            <View style={styles.itemsList}>
              {orderedCoins.map((coin) => (
                <CoinRowList key={coin.id} item={coin} colors={colors} />
              ))}
            </View>
          ) : (
            <View style={styles.itemsGrid}>
              {orderedCoins.map((coin) => (
                <CoinCardGrid key={coin.id} item={coin} colors={colors} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  placeholder: { flex: 1, textAlign: 'center', marginTop: 48, fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '600', marginHorizontal: 12, marginBottom: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { 
    width: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryLabel: { fontSize: 14, marginBottom: 4 },
  summaryTotal: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  summaryBoxLabel: { fontSize: 12, marginBottom: 4 },
  summaryBoxValue: { fontSize: 16, fontWeight: '600' },
  itemsTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyWrapCentered: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 24,
  },
  itemsList: { gap: 0 },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  coinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CARD_HEIGHT,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  coinImagesWrap: {
    width: 96,
    height: 64,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  coinImageBack: {
    position: 'absolute',
    left: 8,
    top: '50%',
    transform: [{ translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  coinImageFront: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  coinCircleImage: { width: '100%', height: '100%' },
  coinImagePlaceholder: {
    position: 'absolute',
    left: 14,
    top: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  coinInfo: { flex: 1, marginLeft: 10 },
  coinName: { fontSize: 16, fontWeight: '500', marginBottom: 4, lineHeight: 24 },
  coinMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  coinDate: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  coinPrice: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
  coinCardGrid: {
    width: '47%',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  coinCardGridImageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  coinCardGridImage: { width: '100%', height: '100%' },
  coinCardGridName: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  coinCardGridPrice: { fontSize: 13, fontWeight: '500' },
});
