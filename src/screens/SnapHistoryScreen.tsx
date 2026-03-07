import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../theme/useThemeColors';
import { supabase } from '../lib/supabase';
import { useSupabaseSession } from '../lib/useSupabaseSession';
import SearchEmptyIcon from '../../assets/empty/search.svg';

export type ScannedCoinRow = {
  id: number;
  name: string;
  country: string;
  year_start: number | null;
  year_end: number | null;
  front_image_url: string | null;
  back_image_url: string | null;
  estimated_price_min: number | null;
  estimated_price_max: number | null;
  scanned_at: string;
  scanned_by_user_id: string | null;
};

function formatScanDate(iso: string): string {
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

const CARD_HEIGHT = 96;

function CoinRow({
  item,
  colors,
  onLongPress,
}: {
  item: ScannedCoinRow;
  colors: ReturnType<typeof useThemeColors>;
  onLongPress: (coin: ScannedCoinRow) => void;
}) {
  const displayName = [item.name, item.country, item.year_start ?? item.year_end].filter(Boolean).join(' ').trim() || item.name;
  const priceText = formatPriceRange(item.estimated_price_min, item.estimated_price_max);
  const hasFront = !!item.front_image_url;
  const hasBack = !!item.back_image_url;

  return (
    <TouchableOpacity
      style={[styles.coinCard, { backgroundColor: colors.surface.onBgBase }]}
      activeOpacity={1}
      onLongPress={() => onLongPress(item)}
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
        <Text
          style={[styles.coinName, { color: colors.text.textBase }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayName}
        </Text>
        <View style={styles.coinMetaRow}>
          <Text style={[styles.coinDate, { color: colors.text.textTertiary }]}>
            {formatScanDate(item.scanned_at)}
          </Text>
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

export default function SnapHistoryScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation();
  const { session } = useSupabaseSession();
  const [coins, setCoins] = useState<ScannedCoinRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setCoins([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('coins')
      .select('id, name, country, year_start, year_end, front_image_url, back_image_url, estimated_price_min, estimated_price_max, scanned_at, scanned_by_user_id')
      .eq('scanned_by_user_id', session.user.id)
      .order('scanned_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (error) return;
        setCoins((data as ScannedCoinRow[]) ?? []);
      });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const handleLongPress = (_coin: ScannedCoinRow) => {
    // Keyinchalik: Add to Collection va boshqa actionlar
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgBaseElevated }]}>
      <View style={[styles.header, { borderBottomColor: colors.border.border3 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <ChevronLeft size={24} color={colors.text.textBase} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.textBase }]}>Snap History</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.text.textBase} />
        </View>
      ) : coins.length === 0 ? (
        <View style={styles.emptyWrap}>
          <SearchEmptyIcon width={68} height={68} />
          <Text style={[styles.emptyTitle, { color: colors.text.textTertiary }]}>
            You didn't scanned any coins
          </Text>
        </View>
      ) : (
        <FlashList
          data={coins}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <CoinRow item={item} colors={colors} onLongPress={handleLongPress} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 12 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    width: 32,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 24,
  },
  listContent: {
    padding: 20,
    paddingTop: 16,
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
    top: "50%",
    transform: [{ translateY: "-50%" }],
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  coinImageFront: {
    position: 'absolute',
    right: 8,
    top: "50%",
    transform: [{ translateY: "-50%" }],
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  coinCircleImage: {
    width: '100%',
    height: '100%',
  },
  coinImagePlaceholder: {
    position: 'absolute',
    left: 14,
    top: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  coinInfo: {
    flex: 1,
    marginLeft: 10,
  },
  coinName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 24,
  },
  coinMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  coinDate: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  coinPrice: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
});
