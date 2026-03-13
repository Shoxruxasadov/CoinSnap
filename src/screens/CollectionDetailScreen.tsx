import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { Image } from 'expo-image';
import { ChevronLeft, LayoutGrid, List, MoreHorizontal, MoreVertical, Pencil, Trash2, FolderPlus, X, Plus } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useThemeColors } from '../theme/useThemeColors';
import { triggerSelection } from '../lib/haptics';
import { formatPriceRange, formatPrice } from '../lib/currency';
import { useSettingsStore } from '../store/settingsStore';
import { useLocalCollectionStore } from '../store/localCollectionStore';
import { useSupabaseSession } from '../lib/useSupabaseSession';

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
      <View style={[styles.coinImagesWrap, { backgroundColor: colors.surface.surface }]}>
        {hasFront && (
          <View style={[styles.coinImageBack, { borderColor: colors.surface.surface }]}>
            <Image
              source={{ uri: item.front_image_url! }}
              style={styles.coinCircleImage}
              contentFit="cover"
              cachePolicy="disk"
              transition={150}
            />
          </View>
        )}
        {hasBack && (
          <View style={[styles.coinImageFront, { borderColor: colors.surface.surface }]}>
            <Image
              source={{ uri: item.back_image_url! }}
              style={styles.coinCircleImage}
              contentFit="cover"
              cachePolicy="disk"
              transition={150}
            />
          </View>
        )}
        {!hasFront && !hasBack && (
          <View style={[styles.coinImagePlaceholder, { backgroundColor: colors.surface.surface }]} />
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
  currency,
}: {
  item: CollectionCoinRow;
  colors: ReturnType<typeof useThemeColors>;
  onPress: (coin: CollectionCoinRow) => void;
  onDotsPress: (coin: CollectionCoinRow) => void;
  currency: string;
}) {
  const displayName = [item.name, item.country, item.year_start ?? item.year_end].filter(Boolean).join(' ').trim() || item.name;
  const priceText = formatPriceRange(item.estimated_price_min, item.estimated_price_max, currency);
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
      <View style={[styles.coinCardGridImageWrap, { backgroundColor: colors.surface.surface }]}>
        {(hasFront || hasBack) ? (
          <View style={styles.coinCardGridCoins}>
            {hasFront && (
              <Image
                source={{ uri: item.front_image_url! }}
                style={styles.coinCardGridCoinImg}
                contentFit="contain"
                cachePolicy="disk"
                transition={150}
              />
            )}
            {hasBack && (
              <Image
                source={{ uri: item.back_image_url! }}
                style={[styles.coinCardGridCoinImg, hasFront && { marginLeft: -20 }]}
                contentFit="contain"
                cachePolicy="disk"
                transition={150}
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
  const currency = useSettingsStore((s) => s.currency);
  const { session } = useSupabaseSession();
  const { coins: localCoins, generalCoinIds, removeCoinFromGeneral } = useLocalCollectionStore();
  const isLocalCollection = collection?.id === -1;

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
  const [newCollectionName, setNewCollectionName] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);

  const moreSheetRef = useRef<BottomSheet>(null);
  const editSheetRef = useRef<BottomSheet>(null);
  const itemActionSheetRef = useRef<BottomSheet>(null);
  const itemAddToSheetRef = useRef<BottomSheet>(null);
  const newCollectionSheetRef = useRef<BottomSheet>(null);
  const moreSnapPoints = useMemo(() => [180], []);
  const editSnapPoints = useMemo(() => [260], []);
  const itemActionSnapPoints = useMemo(() => [160], []);
  const newCollectionSnapPoints = useMemo(() => [280], []);

  // For local collection, use live generalCoinIds from store
  const coinIds = isLocalCollection ? generalCoinIds : (collection?.coin_ids ?? []);
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
    
    // Handle local collection (id = -1)
    if (isLocalCollection) {
      const localCoinData = localCoins
        .filter((c) => generalCoinIds.includes(c.id))
        .map((c) => ({
          ...c,
          scanned_at: null,
        } as CollectionCoinRow));
      setCoins(localCoinData);
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
  }, [collection?.id, coinIds.join(','), isLocalCollection, localCoins, generalCoinIds]);

  const [allCoinsMap, setAllCoinsMap] = useState<Record<number, { id: number; front_image_url: string | null; back_image_url: string | null }>>({});

  useEffect(() => {
    const userId = collection?.user_id;
    if (!userId) return;
    supabase.from('collections').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setAllCollections(data as CollectionRow[]); });
  }, [collection?.user_id]);

  useEffect(() => {
    const allIds = new Set<number>();
    allCollections.forEach((c) => (c.coin_ids ?? []).forEach((id) => allIds.add(id)));
    const idsArr = Array.from(allIds);
    if (idsArr.length === 0) {
      setAllCoinsMap({});
      return;
    }
    supabase
      .from('coins')
      .select('id, front_image_url, back_image_url')
      .in('id', idsArr)
      .then(({ data }) => {
        if (data) {
          const map: Record<number, { id: number; front_image_url: string | null; back_image_url: string | null }> = {};
          data.forEach((c) => { map[c.id] = c; });
          setAllCoinsMap(map);
        }
      });
  }, [allCollections]);

  const getCollectionCoins = (col: CollectionRow) => {
    return (col.coin_ids ?? [])
      .slice(-4)
      .map((id) => allCoinsMap[id])
      .filter(Boolean);
  };

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
          if (isLocalCollection) {
            // Remove from local collection
            removeCoinFromGeneral(selectedCoin.id);
            setCoins((prev) => prev.filter((c) => c.id !== selectedCoin.id));
            setSelectedCoin(null);
          } else {
            const newIds = (collection.coin_ids || []).filter((id) => id !== selectedCoin.id);
            await supabase.from('collections').update({ coin_ids: newIds, updated_at: new Date().toISOString() }).eq('id', collection.id);
            setSelectedCoin(null);
            navigation.goBack();
          }
        },
      },
    ]);
  };

  const handleItemConfirmAddTo = async () => {
    if (!selectedCollectionId || !selectedCoin || !collection) return;
    const col = allCollections.find((c) => c.id === selectedCollectionId);
    if (!col) return;

    // Remove from current collection
    const oldIds = (collection.coin_ids || []).filter((id) => id !== selectedCoin.id);
    await supabase.from('collections').update({ coin_ids: oldIds, updated_at: new Date().toISOString() }).eq('id', collection.id);

    // Add to new collection
    const newIds = [...(col.coin_ids || []), selectedCoin.id];
    await supabase.from('collections').update({ coin_ids: newIds, updated_at: new Date().toISOString() }).eq('id', col.id);

    itemAddToSheetRef.current?.close();
    setSelectedCollectionId(null);
    setSelectedCoin(null);
    Alert.alert('Moved', `Coin moved to "${col.name}"`);
    navigation.goBack();
  };

  const openNewCollectionSheet = () => {
    triggerSelection();
    itemAddToSheetRef.current?.close();
    setNewCollectionName('');
    setTimeout(() => newCollectionSheetRef.current?.expand(), 200);
  };

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name || !session?.user?.id || !selectedCoin || !collection) return;
    setCreatingCollection(true);

    // Create new collection with the selected coin
    const { data: newCol, error } = await supabase
      .from('collections')
      .insert({ user_id: session.user.id, name, coin_ids: [selectedCoin.id] })
      .select()
      .single();

    if (error) {
      setCreatingCollection(false);
      Alert.alert('Error', error.message);
      return;
    }

    // Remove coin from current collection
    const oldIds = (collection.coin_ids || []).filter((id) => id !== selectedCoin.id);
    await supabase.from('collections').update({ coin_ids: oldIds, updated_at: new Date().toISOString() }).eq('id', collection.id);

    setCreatingCollection(false);
    newCollectionSheetRef.current?.close();
    setNewCollectionName('');
    setSelectedCoin(null);
    Toast.show({ type: 'success', text1: `Coin moved to "${name}"` });
    navigation.goBack();
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgBaseElevated }]}>
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
                  {formatPrice(summary.total, currency, { decimals: 0 })}
                </Text>
                <View style={styles.summaryRow}>
                  <View style={[styles.summaryBox, { backgroundColor: colors.surface.surface }]}>
                    <Text style={[styles.summaryBoxLabel, { color: colors.text.textTertiary }]}>Lowest Coin</Text>
                    <Text style={[styles.summaryBoxValue, { color: colors.text.textBase }]}>
                      {summary.lowest != null ? formatPrice(summary.lowest, currency) : '—'}
                    </Text>
                  </View>
                  <View style={[styles.summaryBox, { backgroundColor: colors.surface.surface }]}>
                    <Text style={[styles.summaryBoxLabel, { color: colors.text.textTertiary }]}>Highest Coin</Text>
                    <Text style={[styles.summaryBoxValue, { color: colors.text.textBase }]}>
                      {summary.highest != null ? formatPrice(summary.highest, currency) : '—'}
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
                <CoinCardGrid key={coin.id} item={coin} colors={colors} onPress={handlePress} onDotsPress={handleItemDotsPress} currency={currency} />
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
        backgroundStyle={{ backgroundColor: colors.surface.onBgBase }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border4, width: 36, height: 4, borderRadius: 2 }}
      >
        <BottomSheetView style={sheetStyles.container}>
          <TouchableOpacity style={sheetStyles.row} onPress={handleEditCollection}>
            <Pencil size={22} color={colors.text.textBase} />
            <Text style={[sheetStyles.rowText, { color: colors.text.textBase }]}>Edit collection</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[sheetStyles.row, collection?.is_default && { opacity: 0.35 }]}
            onPress={collection?.is_default ? undefined : handleDeleteCollection}
            disabled={!!collection?.is_default}
          >
            <Trash2 size={22} color={colors.state.red} />
            <Text style={[sheetStyles.rowText, { color: colors.state.red }]}>Delete collection</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* Edit Collection Bottom Sheet */}
      <BottomSheet
        ref={editSheetRef}
        index={-1}
        snapPoints={editSnapPoints}
        enablePanDownToClose
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface.onBgBase }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border4, width: 36, height: 4, borderRadius: 2 }}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetView style={sheetStyles.editContainer}>
          <Text style={[sheetStyles.editTitle, { color: colors.text.textBase }]}>Edit Collection</Text>
          <Text style={[sheetStyles.inputLabel, { color: colors.text.textBase }]}>Collection name</Text>
          <BottomSheetTextInput
            style={[sheetStyles.input, { backgroundColor: colors.surface.onBgBase, color: colors.text.textBase, borderColor: colors.border.border3 }]}
            value={editName}
            onChangeText={setEditName}
            placeholder="Collection name"
            placeholderTextColor={colors.text.textTertiary}
          />
          <TouchableOpacity
            style={[sheetStyles.saveBtn, { backgroundColor: editName.trim() ? colors.background.bgInverse : colors.surface.surfaceElevated }]}
            onPress={handleSaveEdit}
            disabled={!editName.trim()}
            activeOpacity={0.8}
          >
            <Text style={[sheetStyles.saveBtnText, { color: editName.trim() ? colors.text.textInverse : colors.text.textTertiary }]}>
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
        backgroundStyle={{ backgroundColor: colors.surface.onBgBase }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border4, width: 36, height: 4, borderRadius: 2 }}
      >
        <BottomSheetView style={sheetStyles.container}>
          {!isLocalCollection && (
            <TouchableOpacity style={sheetStyles.actionRow} onPress={handleItemOpenAddTo}>
              <FolderPlus size={22} color={colors.text.textBase} />
              <Text style={[sheetStyles.actionRowText, { color: colors.text.textBase }]}>Change collection</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={sheetStyles.actionRow} onPress={handleItemDelete}>
            <Trash2 size={22} color={colors.state.red} />
            <Text style={[sheetStyles.actionRowText, { color: colors.state.red }]}>Delete</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* Item Add To Bottom Sheet */}
      <BottomSheet
        ref={itemAddToSheetRef}
        index={-1}
        enableDynamicSizing
        snapPoints={[320]}
        maxDynamicContentSize={SCREEN_HEIGHT}
        enablePanDownToClose
        enableOverDrag={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface.onBgBase, borderTopLeftRadius: 28, borderTopRightRadius: 28}}
        handleIndicatorStyle={{ backgroundColor: colors.border.border3, width: 40 }}
      >
        <BottomSheetView>
          <View style={sheetStyles.addToHeader}>
            <Text style={[sheetStyles.addToTitle, { color: colors.text.textBase }]}>Change collection</Text>
            <TouchableOpacity onPress={() => itemAddToSheetRef.current?.close()}>
              <X size={24} color={colors.text.textBase} />
            </TouchableOpacity>
          </View>
          <View style={[sheetStyles.divider, { backgroundColor: colors.border.border3 }]} />
          <BottomSheetScrollView
            style={{ maxHeight: SCREEN_HEIGHT * 0.55 }}
            contentContainerStyle={sheetStyles.scrollContent}
          >
            {allCollections.filter((c) => c.id !== collection?.id).map((col) => {
              const isSelected = selectedCollectionId === col.id;
              const coinImages = getCollectionCoins(col);
              return (
                <TouchableOpacity
                  key={col.id}
                  style={[
                    sheetStyles.collectionRow,
                    {
                      borderColor: isSelected ? colors.text.textBase : colors.border.border3,
                      backgroundColor: colors.surface.onBgBase,
                    },
                    isSelected && { borderWidth: 2 },
                  ]}
                  onPress={() => { triggerSelection(); setSelectedCollectionId(col.id); }}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={[sheetStyles.collectionName, { color: colors.text.textBase }]}>{col.name}</Text>
                    <Text style={[sheetStyles.collectionCount, { color: colors.text.textTertiary }]}>{(col.coin_ids || []).length} items</Text>
                  </View>
                  <View style={sheetStyles.collectionCoins}>
                    {(() => {
                      const placeholder = (key: string, ml: boolean) => (
                        <View
                          key={key}
                          style={[
                            sheetStyles.collectionCoinImg,
                            {
                              marginLeft: ml ? -12 : 0,
                              borderColor: colors.surface.onBgBase,
                              backgroundColor: colors.border.border3,
                            },
                          ]}
                        />
                      );

                      if (coinImages.length === 0) {
                        return [placeholder('p0', false), placeholder('p1', true), placeholder('p2', true), placeholder('p3', true)];
                      }

                      const els: React.ReactNode[] = [];
                      const last2 = coinImages.slice(-2);
                      last2.forEach((c) => {
                        const ml = els.length > 0;
                        if (c.front_image_url) {
                          els.push(
                            <Image key={`${c.id}-f`} source={{ uri: c.front_image_url }} style={[sheetStyles.collectionCoinImg, { marginLeft: ml ? -12 : 0, borderColor: colors.surface.onBgBase }]} cachePolicy="disk" />
                          );
                        } else {
                          els.push(placeholder(`${c.id}-fp`, ml));
                        }
                        if (c.back_image_url) {
                          els.push(
                            <Image key={`${c.id}-b`} source={{ uri: c.back_image_url }} style={[sheetStyles.collectionCoinImg, { marginLeft: -12, borderColor: colors.surface.onBgBase }]} cachePolicy="disk" />
                          );
                        } else {
                          els.push(placeholder(`${c.id}-bp`, true));
                        }
                      });
                      while (els.length < 4) {
                        els.push(placeholder(`p${els.length}`, els.length > 0));
                      }
                      return els.slice(0, 4);
                    })()}
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[
                sheetStyles.newFolderRow,
                { borderColor: colors.border.border3, backgroundColor: colors.surface.onBgBase },
              ]}
              onPress={openNewCollectionSheet}
            >
              <View>
                <Text style={[sheetStyles.collectionName, { color: colors.text.textBase }]}>New Folder</Text>
                <Text style={[sheetStyles.collectionCount, { color: colors.text.textTertiary }]}>Tap to create new</Text>
              </View>
              <View style={[sheetStyles.plusCircle, { backgroundColor: colors.border.border3 }]}>
                <Plus size={22} color={colors.text.textBase} />
              </View>
            </TouchableOpacity>
          </BottomSheetScrollView>
          <View style={[sheetStyles.divider, { backgroundColor: colors.border.border3 }]} />
          <TouchableOpacity
            style={[sheetStyles.confirmBtn, { backgroundColor: selectedCollectionId ? colors.background.bgInverse : colors.border.border3, marginBottom: 16 }]}
            onPress={handleItemConfirmAddTo}
            disabled={!selectedCollectionId}
            activeOpacity={0.8}
          >
            <Text style={[sheetStyles.confirmBtnText, { color: selectedCollectionId ? colors.text.textInverse : colors.text.textTertiary }]}>Confirm</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* New Collection Bottom Sheet */}
      <BottomSheet
        ref={newCollectionSheetRef}
        index={-1}
        snapPoints={newCollectionSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface.onBgBase }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border3, width: 40 }}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetView style={sheetStyles.newCollectionContainer}>
          <View style={sheetStyles.newCollectionBody}>
            <Text style={[sheetStyles.addToTitle, { color: colors.text.textBase, marginBottom: 16 }]}>New Collection</Text>
            <Text style={[sheetStyles.inputLabel, { color: colors.text.textBase }]}>Collection name</Text>
            <BottomSheetTextInput
              style={[sheetStyles.input, { backgroundColor: colors.surface.onBgBase, color: colors.text.textBase, borderColor: colors.border.border3 }]}
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              placeholder="Ancient collection"
              placeholderTextColor={colors.text.textTertiary}
            />
          </View>
          <View style={sheetStyles.newCollectionFooter}>
            <TouchableOpacity
              style={[sheetStyles.confirmBtn, { backgroundColor: newCollectionName.trim() ? colors.background.bgInverse : colors.border.border3, marginBottom: 16 }]}
              onPress={handleCreateCollection}
              disabled={!newCollectionName.trim() || creatingCollection}
              activeOpacity={0.8}
            >
              {creatingCollection ? (
                <ActivityIndicator size="small" color={colors.text.textInverse} />
              ) : (
                <Text style={[sheetStyles.confirmBtnText, { color: newCollectionName.trim() ? colors.text.textInverse : colors.text.textTertiary }]}>Create & Move</Text>
              )}
            </TouchableOpacity>
          </View>
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
    width: 100,
    height: 64,
    borderRadius: 14,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinImageBack: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    marginRight: -8,
    zIndex: 1,
  },
  coinImageFront: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    marginLeft: -8,
    zIndex: 2,
  },
  coinCircleImage: { width: '100%', height: '100%' },
  coinImagePlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
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
  addToHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 18,
  },
  addToTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 20,
  },
  collectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    minHeight: 84,
  },
  collectionName: {
    fontSize: 18,
    fontWeight: '500',
  },
  collectionCount: {
    fontSize: 15,
    marginTop: 4,
  },
  collectionCoins: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionCoinImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  confirmBtn: {
    borderRadius: 18,
    width: '90%',
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 18,
  },
  confirmBtnText: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyState: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  newFolderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 14,
    minHeight: 84,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  plusCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCollectionContainer: {
    flex: 1,
  },
  newCollectionBody: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  newCollectionFooter: {
    marginTop: 'auto',
  },
});
