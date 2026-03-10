import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { ChevronLeft, LayoutGrid, List, MoreHorizontal, MoreVertical, Pencil, Trash2, FolderPlus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useThemeColors } from '../theme/useThemeColors';
import { triggerSelection } from '../lib/haptics';

type Nav = NativeStackNavigationProp<MainStackParamList>;
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
  mintage: number | null;
  composition: string | null;
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
  onPress,
  onDotsPress,
}: {
  item: CollectionCoinRow;
  colors: ReturnType<typeof useThemeColors>;
  onPress: (coin: CollectionCoinRow) => void;
  onDotsPress: (coin: CollectionCoinRow) => void;
}) {
  const displayName = [item.name, item.country, item.year_start ?? item.year_end].filter(Boolean).join(' ').trim() || item.name;
  const hasFront = !!item.front_image_url;
  const hasBack = !!item.back_image_url;
  const dateStr = formatDate(item.scanned_at ?? item.created_at);

  return (
    <TouchableOpacity
      style={[styles.coinCard, { backgroundColor: colors.surface.onBgBase }]}
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      onLongPress={() => onDotsPress(item)}
    >
      <View style={[styles.coinImagesWrap, { backgroundColor: colors.surface.onBgAlt }]}>
        {hasFront && (
          <View style={styles.coinImageBack}>
            <Animated.Image
              source={{ uri: item.front_image_url! }}
              style={styles.coinCircleImage}
              resizeMode="cover"
              sharedTransitionTag={`coin-front-${item.id}`}
            />
          </View>
        )}
        {hasBack && (
          <View style={styles.coinImageFront}>
            <Animated.Image
              source={{ uri: item.back_image_url! }}
              style={styles.coinCircleImage}
              resizeMode="cover"
              sharedTransitionTag={`coin-back-${item.id}`}
            />
          </View>
        )}
        {!hasFront && !hasBack && (
          <View style={[styles.coinImagePlaceholder, { backgroundColor: colors.surface.onBgAlt }]} />
        )}
      </View>
      <View style={styles.coinInfo}>
        <Text style={[styles.coinName, { color: colors.text.textBase }]} numberOfLines={2} ellipsizeMode="tail">
          {displayName}
        </Text>
        <Text style={[styles.coinDate, { color: colors.text.textTertiary }]}>{dateStr}</Text>
      </View>
      <TouchableOpacity style={styles.dotsBtn} onPress={() => onDotsPress(item)} hitSlop={8}>
        <MoreVertical size={20} color={colors.text.textAlt} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function CoinCardGrid({
  item,
  colors,
  onPress,
  onDotsPress,
}: {
  item: CollectionCoinRow;
  colors: ReturnType<typeof useThemeColors>;
  onPress: (coin: CollectionCoinRow) => void;
  onDotsPress: (coin: CollectionCoinRow) => void;
}) {
  const displayName = [item.name, item.country, item.year_start ?? item.year_end].filter(Boolean).join(' ').trim() || item.name;
  const priceText = formatPriceRange(item.estimated_price_min, item.estimated_price_max);
  const hasFront = !!item.front_image_url;
  const hasBack = !!item.back_image_url;
  const dateStr = formatDate(item.scanned_at ?? item.created_at);

  return (
    <TouchableOpacity
      style={[styles.coinCardGrid, { backgroundColor: colors.surface.onBgBase }]}
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      onLongPress={() => onDotsPress(item)}
    >
      <View style={[styles.coinCardGridImageWrap, { backgroundColor: colors.surface.onBgAlt }]}>
        {(hasFront || hasBack) ? (
          <View style={styles.coinCardGridCoins}>
            {hasFront && (
              <Animated.Image
                source={{ uri: item.front_image_url! }}
                style={styles.coinCardGridCoinImg}
                resizeMode="contain"
                sharedTransitionTag={`coin-front-${item.id}`}
              />
            )}
            {hasBack && (
              <Animated.Image
                source={{ uri: item.back_image_url! }}
                style={[styles.coinCardGridCoinImg, hasFront && { marginLeft: -20 }]}
                resizeMode="contain"
                sharedTransitionTag={`coin-back-${item.id}`}
              />
            )}
          </View>
        ) : (
          <View style={[styles.coinCardGridPlaceholder, { backgroundColor: colors.border.border3 }]} />
        )}
      </View>
      <Text style={[styles.coinCardGridName, { color: colors.text.textBase }]} numberOfLines={1} ellipsizeMode="tail">
        {displayName}
      </Text>
      <View style={styles.coinCardGridMeta}>
        <Text style={[styles.coinCardGridDate, { color: colors.text.textTertiary }]}>{dateStr}</Text>
        {priceText ? (
          <Text style={[styles.coinCardGridPrice, { color: colors.text.textBrand }]} numberOfLines={1}>
            {priceText}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function CollectionDetailScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const route = useRoute<CollectionDetailRoute>();
  const navigation = useNavigation<Nav>();
  const collection = route.params?.collection;

  const handlePress = (coin: CollectionCoinRow) => {
    navigation.navigate('ScanResult', { coin });
  };

  const [coins, setCoins] = useState<CollectionCoinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editName, setEditName] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<CollectionCoinRow | null>(null);
  const [allCollections, setAllCollections] = useState<CollectionRow[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);

  const moreSheetRef = useRef<BottomSheet>(null);
  const editSheetRef = useRef<BottomSheet>(null);
  const itemActionSheetRef = useRef<BottomSheet>(null);
  const itemAddToSheetRef = useRef<BottomSheet>(null);
  const moreSnapPoints = useMemo(() => [180], []);
  const editSnapPoints = useMemo(() => [260], []);
  const itemActionSnapPoints = useMemo(() => [160], []);
  const itemAddToSnapPoints = useMemo(() => ['55%'], []);

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
      .select('*')
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

  useEffect(() => {
    const userId = collection?.user_id;
    if (!userId) return;
    supabase.from('collections').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setAllCollections(data as CollectionRow[]); });
  }, [collection?.user_id]);

  const coinInAnyCollection = useMemo(() => {
    if (!selectedCoin) return false;
    return allCollections.some((c) => (c.coin_ids || []).includes(selectedCoin.id));
  }, [selectedCoin, allCollections]);

  const handleItemDotsPress = (coin: CollectionCoinRow) => {
    triggerSelection();
    setSelectedCoin(coin);
    itemActionSheetRef.current?.expand();
  };

  const handleItemOpenAddTo = () => {
    itemActionSheetRef.current?.close();
    setTimeout(() => itemAddToSheetRef.current?.expand(), 200);
  };

  const handleItemDelete = () => {
    itemActionSheetRef.current?.close();
    if (!selectedCoin || !collection) return;
    Alert.alert('Remove Coin', 'Remove this coin from the collection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const newIds = (collection.coin_ids || []).filter((id) => id !== selectedCoin.id);
          await supabase.from('collections').update({ coin_ids: newIds, updated_at: new Date().toISOString() }).eq('id', collection.id);
          setSelectedCoin(null);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleItemConfirmAddTo = async () => {
    if (!selectedCollectionId || !selectedCoin) return;
    const col = allCollections.find((c) => c.id === selectedCollectionId);
    if (!col) return;
    const newIds = [...(col.coin_ids || []), selectedCoin.id];
    await supabase.from('collections').update({ coin_ids: newIds, updated_at: new Date().toISOString() }).eq('id', col.id);
    itemAddToSheetRef.current?.close();
    setSelectedCollectionId(null);
    setSelectedCoin(null);
    Alert.alert('Added', `Coin added to "${col.name}"`);
  };

  const toggleViewMode = () => {
    triggerSelection();
    setViewMode((prev) => (prev === 'list' ? 'card' : 'list'));
  };

  const handleOpenMore = () => {
    triggerSelection();
    moreSheetRef.current?.expand();
  };

  const handleEditCollection = () => {
    moreSheetRef.current?.close();
    setEditName(collection?.name ?? '');
    setTimeout(() => editSheetRef.current?.expand(), 200);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !collection) return;
    await supabase
      .from('collections')
      .update({ name: editName.trim(), updated_at: new Date().toISOString() })
      .eq('id', collection.id);
    editSheetRef.current?.close();
    navigation.goBack();
  };

  const handleDeleteCollection = () => {
    moreSheetRef.current?.close();
    Alert.alert(
      'Delete Collection',
      `Are you sure you want to delete "${collection?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!collection) return;
            await supabase.from('collections').delete().eq('id', collection.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />,
    []
  );

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
      <View style={[styles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <ChevronLeft size={24} color={colors.text.textBase} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.textBase }]} numberOfLines={1} ellipsizeMode="tail">
          {collection.name}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={toggleViewMode}>
            {isList ? (
              <LayoutGrid size={22} color={colors.text.textAlt} />
            ) : (
              <List size={22} color={colors.text.textAlt} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleOpenMore}>
            <MoreHorizontal size={22} color={colors.text.textBase} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.text.textBase} />
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
                <CoinRowList key={coin.id} item={coin} colors={colors} onPress={handlePress} onDotsPress={handleItemDotsPress} />
              ))}
            </View>
          ) : (
            <View style={styles.itemsGrid}>
              {orderedCoins.map((coin) => (
                <CoinCardGrid key={coin.id} item={coin} colors={colors} onPress={handlePress} onDotsPress={handleItemDotsPress} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* More Bottom Sheet */}
      <BottomSheet
        ref={moreSheetRef}
        index={-1}
        snapPoints={moreSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background.bgBase }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border3, width: 36, height: 4, borderRadius: 2 }}
      >
        <BottomSheetView style={sheetStyles.container}>
          <TouchableOpacity style={sheetStyles.row} onPress={handleEditCollection}>
            <Pencil size={22} color={colors.text.textBase} />
            <Text style={[sheetStyles.rowText, { color: colors.text.textBase }]}>Edit collection</Text>
          </TouchableOpacity>
          <TouchableOpacity style={sheetStyles.row} onPress={handleDeleteCollection}>
            <Trash2 size={22} color="#E53935" />
            <Text style={[sheetStyles.rowText, { color: '#E53935' }]}>Delete collection</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* Edit Collection Bottom Sheet */}
      <BottomSheet
        ref={editSheetRef}
        index={-1}
        snapPoints={editSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background.bgBase }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border3, width: 36, height: 4, borderRadius: 2 }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetView style={sheetStyles.editContainer}>
          <Text style={[sheetStyles.editTitle, { color: colors.text.textBase }]}>Edit Collection</Text>
          <Text style={[sheetStyles.inputLabel, { color: colors.text.textBase }]}>Collection name</Text>
          <TextInput
            style={[sheetStyles.input, { backgroundColor: colors.surface.onBgBase, color: colors.text.textBase, borderColor: colors.border.border3 }]}
            value={editName}
            onChangeText={setEditName}
            placeholder="Collection name"
            placeholderTextColor={colors.text.textTertiary}
            autoFocus
          />
          <TouchableOpacity
            style={[sheetStyles.saveBtn, { backgroundColor: editName.trim() ? '#1C1C1E' : colors.surface.onBgAlt }]}
            onPress={handleSaveEdit}
            disabled={!editName.trim()}
            activeOpacity={0.8}
          >
            <Text style={[sheetStyles.saveBtnText, { color: editName.trim() ? '#fff' : colors.text.textTertiary }]}>
              Save
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* Item Action Bottom Sheet */}
      <BottomSheet
        ref={itemActionSheetRef}
        index={-1}
        snapPoints={itemActionSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background.bgBase }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border3, width: 36, height: 4, borderRadius: 2 }}
      >
        <BottomSheetView style={sheetStyles.container}>
          {!coinInAnyCollection && (
            <TouchableOpacity style={sheetStyles.actionRow} onPress={handleItemOpenAddTo}>
              <FolderPlus size={22} color={colors.text.textBase} />
              <Text style={[sheetStyles.actionRowText, { color: colors.text.textBase }]}>Add to</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={sheetStyles.actionRow} onPress={handleItemDelete}>
            <Trash2 size={22} color="#E53935" />
            <Text style={[sheetStyles.actionRowText, { color: '#E53935' }]}>Delete</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* Item Add To Bottom Sheet */}
      <BottomSheet
        ref={itemAddToSheetRef}
        index={-1}
        snapPoints={itemAddToSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.background.bgBase }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border3, width: 36, height: 4, borderRadius: 2 }}
      >
        <BottomSheetView style={sheetStyles.addToContent}>
          <View style={sheetStyles.addToHeader}>
            <Text style={[sheetStyles.addToTitle, { color: colors.text.textBase }]}>Add to</Text>
            <TouchableOpacity onPress={() => itemAddToSheetRef.current?.close()}>
              <X size={24} color={colors.text.textAlt} />
            </TouchableOpacity>
          </View>
          <BottomSheetScrollView style={{ flex: 1 }}>
            {allCollections.filter((c) => c.id !== collection?.id).map((col) => {
              const isSelected = selectedCollectionId === col.id;
              return (
                <TouchableOpacity
                  key={col.id}
                  style={[sheetStyles.collectionRow, { borderColor: isSelected ? colors.text.textBrand : colors.border.border3 }, isSelected && { borderWidth: 2 }]}
                  onPress={() => { triggerSelection(); setSelectedCollectionId(col.id); }}
                  activeOpacity={0.7}
                >
                  <Text style={[sheetStyles.collectionName, { color: colors.text.textBase }]}>{col.name}</Text>
                  <Text style={[sheetStyles.collectionCount, { color: colors.text.textTertiary }]}>{(col.coin_ids || []).length} items</Text>
                </TouchableOpacity>
              );
            })}
          </BottomSheetScrollView>
          <TouchableOpacity
            style={[sheetStyles.confirmBtn, { backgroundColor: selectedCollectionId ? '#1C1C1E' : colors.surface.onBgAlt }]}
            onPress={handleItemConfirmAddTo}
            disabled={!selectedCollectionId}
            activeOpacity={0.8}
          >
            <Text style={[sheetStyles.confirmBtnText, { color: selectedCollectionId ? '#fff' : colors.text.textTertiary }]}>Confirm</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
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
    gap: 16,
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
  coinName: { fontSize: 16, fontWeight: '500', marginBottom: 2, lineHeight: 22 },
  coinMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  coinDate: { fontSize: 14, fontWeight: '400', lineHeight: 20, color: '#999' },
  coinPrice: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
  dotsBtn: { padding: 4, marginLeft: 4 },
  coinCardGrid: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  coinCardGridImageWrap: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coinCardGridCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinCardGridCoinImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  coinCardGridPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  coinCardGridName: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 4,
  },
  coinCardGridMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  coinCardGridDate: {
    fontSize: 14,
  },
  coinCardGridPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
});

const sheetStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  rowText: {
    fontSize: 16,
    fontWeight: '500',
  },
  editContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  actionRowText: {
    fontSize: 16,
    fontWeight: '500',
  },
  addToContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  addToHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addToTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  collectionRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  collectionCount: {
    fontSize: 13,
    marginTop: 2,
  },
  confirmBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  confirmBtnText: {
    fontSize: 17,
    fontWeight: '700',
  },
});
