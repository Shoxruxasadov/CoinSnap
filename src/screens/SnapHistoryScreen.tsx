import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { ChevronLeft, MoreVertical, FolderPlus, Trash2, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import type { MainStackParamList } from '../navigation/MainStack';
import { useThemeColors } from '../theme/useThemeColors';
import { triggerSelection } from '../lib/haptics';

type Nav = NativeStackNavigationProp<MainStackParamList>;
import { supabase } from '../lib/supabase';
import { useSupabaseSession } from '../lib/useSupabaseSession';
import type { CollectionRow } from './tabs/CollectionsScreen';
import { useLocalCollectionStore } from '../store/localCollectionStore';
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


const CARD_HEIGHT = 96;

function CoinRow({
  item,
  colors,
  onPress,
  onDotsPress,
}: {
  item: ScannedCoinRow;
  colors: ReturnType<typeof useThemeColors>;
  onPress: (coin: ScannedCoinRow) => void;
  onDotsPress: (coin: ScannedCoinRow) => void;
}) {
  const displayName = [item.name, item.country, item.year_start ?? item.year_end].filter(Boolean).join(' ').trim() || item.name;
  const hasFront = !!item.front_image_url;
  const hasBack = !!item.back_image_url;

  return (
    <TouchableOpacity
      style={[styles.coinCard, { backgroundColor: colors.surface.onBgBase }]}
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      onLongPress={() => onDotsPress(item)}
    >
      <View style={[styles.coinImagesWrap, { backgroundColor: colors.surface.surface }]}>
        {hasFront && (
          <View style={[styles.coinImageBack, { borderColor: colors.surface.surface, backgroundColor: colors.surface.surface }]}>
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
          <View style={[styles.coinImageFront, { borderColor: colors.surface.surface, backgroundColor: colors.surface.surface }]}>
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
          <View style={[styles.coinImagePlaceholder, { backgroundColor: colors.surface.onBgAlt }]} />
        )}
      </View>
      <View style={styles.coinInfo}>
        <Text
          style={[styles.coinName, { color: colors.text.textBase }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {displayName}
        </Text>
        <Text style={[styles.coinDate, { color: colors.text.textTertiary }]}>
          {formatScanDate(item.scanned_at)}
        </Text>
      </View>
      <TouchableOpacity style={styles.dotsBtn} onPress={() => onDotsPress(item)} hitSlop={8}>
        <MoreVertical size={20} color={colors.text.textAlt} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SnapHistoryScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();
  const { session } = useSupabaseSession();
  const userId = session?.user?.id;
  const { getSnapHistory, removeFromSnapHistory } = useLocalCollectionStore();
  const [coins, setCoins] = useState<ScannedCoinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<ScannedCoinRow | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);

  const actionSheetRef = useRef<BottomSheet>(null);
  const addToSheetRef = useRef<BottomSheet>(null);
  const newCollectionSheetRef = useRef<BottomSheet>(null);
  const actionSnapPoints = useMemo(() => [160], []);
  const newCollectionSnapPoints = useMemo(() => [280], []);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);

  const coinInCollection = useMemo(() => {
    if (!selectedCoin) return false;
    return collections.some((c) => (c.coin_ids || []).includes(selectedCoin.id));
  }, [selectedCoin, collections]);

  const fetchCoins = useCallback(() => {
    if (!userId) {
      // Load from local storage for non-logged users
      const localHistory = getSnapHistory();
      const mapped: ScannedCoinRow[] = localHistory.map((c) => ({
        ...c,
        scanned_at: c.created_at,
        scanned_by_user_id: null,
      }));
      setCoins(mapped);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('coins').select('*').eq('scanned_by_user_id', userId).order('scanned_at', { ascending: false })
      .then(({ data, error }) => {
        setLoading(false);
        if (!error) setCoins((data as ScannedCoinRow[]) ?? []);
      });
  }, [userId, getSnapHistory]);

  const [coinsMap, setCoinsMap] = useState<Record<number, { id: number; front_image_url: string | null; back_image_url: string | null }>>({});

  const fetchCollections = useCallback(() => {
    if (!userId) return;
    supabase.from('collections').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setCollections(data as CollectionRow[]); });
  }, [userId]);

  useEffect(() => {
    const allIds = new Set<number>();
    collections.forEach((c) => (c.coin_ids ?? []).forEach((id) => allIds.add(id)));
    const idsArr = Array.from(allIds);
    if (idsArr.length === 0) {
      setCoinsMap({});
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
          setCoinsMap(map);
        }
      });
  }, [collections]);

  const getCollectionCoins = (col: CollectionRow) => {
    return (col.coin_ids ?? [])
      .slice(-4)
      .map((id) => coinsMap[id])
      .filter(Boolean);
  };

  useFocusEffect(useCallback(() => { fetchCoins(); fetchCollections(); }, [fetchCoins, fetchCollections]));

  const handlePress = (coin: ScannedCoinRow) => {
    navigation.navigate('ScanResult', { coin });
  };

  const handleDotsPress = (coin: ScannedCoinRow) => {
    triggerSelection();
    setSelectedCoin(coin);
    actionSheetRef.current?.expand();
  };

  const handleOpenAddTo = () => {
    actionSheetRef.current?.close();
    if (!userId) {
      navigation.dispatch(CommonActions.navigate({ name: 'GetStarted' }));
      return;
    }
    setTimeout(() => addToSheetRef.current?.expand(), 200);
  };

  const handleDeleteCoin = () => {
    actionSheetRef.current?.close();
    if (!selectedCoin) return;
    const coinToDelete = selectedCoin;
    Alert.alert('Delete Coin', 'Are you sure you want to delete this coin?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          // Immediately remove from local state for instant UI feedback
          setCoins((prev) => prev.filter((c) => c.id !== coinToDelete.id));
          setSelectedCoin(null);
          
          if (userId) {
            // Delete from database for logged-in users
            await supabase.from('coins').delete().eq('id', coinToDelete.id);
          } else {
            // Delete from local storage for non-logged users
            removeFromSnapHistory(coinToDelete.id);
          }
        },
      },
    ]);
  };

  const handleConfirmAddTo = async () => {
    if (!selectedCollectionId || !selectedCoin) return;
    const col = collections.find((c) => c.id === selectedCollectionId);
    if (!col) return;
    const newIds = [...(col.coin_ids || []), selectedCoin.id];
    await supabase.from('collections').update({ coin_ids: newIds, updated_at: new Date().toISOString() }).eq('id', col.id);
    addToSheetRef.current?.close();
    setSelectedCollectionId(null);
    setSelectedCoin(null);
    fetchCollections();
    Alert.alert('Added', `Coin added to "${col.name}"`);
  };

  const openNewCollectionSheet = () => {
    triggerSelection();
    addToSheetRef.current?.close();
    setNewCollectionName('');
    setTimeout(() => newCollectionSheetRef.current?.expand(), 200);
  };

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name || !userId || !selectedCoin) return;
    setCreatingCollection(true);

    const { data: newCol, error } = await supabase
      .from('collections')
      .insert({ user_id: userId, name, coin_ids: [selectedCoin.id] })
      .select()
      .single();

    if (error) {
      setCreatingCollection(false);
      Alert.alert('Error', error.message);
      return;
    }

    setCreatingCollection(false);
    newCollectionSheetRef.current?.close();
    setNewCollectionName('');
    setSelectedCoin(null);
    fetchCollections();
    Toast.show({ type: 'success', text1: `Coin added to "${name}"` });
  };

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />, []
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgBaseElevated }]}>
      <View style={[styles.header]}>
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
          renderItem={({ item }) => <CoinRow item={item} colors={colors} onPress={handlePress} onDotsPress={handleDotsPress} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 12 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Action Bottom Sheet */}
      <BottomSheet
        ref={actionSheetRef}
        index={-1}
        snapPoints={actionSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface.onBgBase }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border3, width: 36, height: 4, borderRadius: 2 }}
      >
        <BottomSheetView style={actionStyles.container}>
          {!coinInCollection && (
            <TouchableOpacity style={actionStyles.row} onPress={handleOpenAddTo}>
              <FolderPlus size={22} color={colors.text.textBase} />
              <Text style={[actionStyles.rowText, { color: colors.text.textBase }]}>Add to</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={actionStyles.row} onPress={handleDeleteCoin}>
            <Trash2 size={22} color={colors.state.red} />
            <Text style={[actionStyles.rowText, { color: colors.state.red }]}>Delete</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      {/* Add To Bottom Sheet */}
      <BottomSheet
        ref={addToSheetRef}
        index={-1}
        enableDynamicSizing
        snapPoints={[320]}
        maxDynamicContentSize={SCREEN_HEIGHT}
        enablePanDownToClose
        enableOverDrag={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface.onBgBase, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border3, width: 40 }}
      >
        <BottomSheetView>
          <View style={actionStyles.sheetHeader}>
            <Text style={[actionStyles.sheetTitle, { color: colors.text.textBase }]}>Add to</Text>
            <TouchableOpacity onPress={() => addToSheetRef.current?.close()}>
              <X size={24} color={colors.text.textBase} />
            </TouchableOpacity>
          </View>
          <View style={[actionStyles.divider, { backgroundColor: colors.border.border3 }]} />
          <BottomSheetScrollView
            style={{ maxHeight: SCREEN_HEIGHT * 0.55 }}
            contentContainerStyle={actionStyles.scrollContent}
          >
            {collections.map((col) => {
              const isSelected = selectedCollectionId === col.id;
              const coinImages = getCollectionCoins(col);
              return (
                <TouchableOpacity
                  key={col.id}
                  style={[
                    actionStyles.collectionRow,
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
                    <Text style={[actionStyles.collectionName, { color: colors.text.textBase }]}>{col.name}</Text>
                    <Text style={[actionStyles.collectionCount, { color: colors.text.textTertiary }]}>{(col.coin_ids || []).length} items</Text>
                  </View>
                  <View style={actionStyles.collectionCoins}>
                    {(() => {
                      const placeholder = (key: string, ml: boolean) => (
                        <View
                          key={key}
                          style={[
                            actionStyles.collectionCoinImg,
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
                            <Image key={`${c.id}-f`} source={{ uri: c.front_image_url }} style={[actionStyles.collectionCoinImg, { marginLeft: ml ? -12 : 0, borderColor: colors.surface.onBgBase }]} cachePolicy="disk" />
                          );
                        } else {
                          els.push(placeholder(`${c.id}-fp`, ml));
                        }
                        if (c.back_image_url) {
                          els.push(
                            <Image key={`${c.id}-b`} source={{ uri: c.back_image_url }} style={[actionStyles.collectionCoinImg, { marginLeft: -12, borderColor: colors.surface.onBgBase }]} cachePolicy="disk" />
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
                actionStyles.newFolderRow,
                { borderColor: colors.border.border3, backgroundColor: colors.surface.onBgBase },
              ]}
              onPress={openNewCollectionSheet}
            >
              <View>
                <Text style={[actionStyles.collectionName, { color: colors.text.textBase }]}>New Folder</Text>
                <Text style={[actionStyles.collectionCount, { color: colors.text.textTertiary }]}>Tap to create new</Text>
              </View>
              <View style={[actionStyles.plusCircle, { backgroundColor: colors.border.border3 }]}>
                <Plus size={22} color={colors.text.textBase} />
              </View>
            </TouchableOpacity>
          </BottomSheetScrollView>
          <View style={[actionStyles.divider, { backgroundColor: colors.border.border3 }]} />
          <TouchableOpacity
            style={[actionStyles.confirmBtn, { backgroundColor: selectedCollectionId ? colors.background.bgInverse : colors.border.border3, marginBottom: 16 }]}
            onPress={handleConfirmAddTo}
            disabled={!selectedCollectionId}
            activeOpacity={0.8}
          >
            <Text style={[actionStyles.confirmBtnText, { color: selectedCollectionId ? colors.text.textInverse : colors.text.textTertiary }]}>Confirm</Text>
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
        <BottomSheetView style={actionStyles.newCollectionContainer}>
          <View style={actionStyles.newCollectionBody}>
            <Text style={[actionStyles.sheetTitle, { color: colors.text.textBase, marginBottom: 16 }]}>New Collection</Text>
            <Text style={[actionStyles.inputLabel, { color: colors.text.textBase }]}>Collection name</Text>
            <BottomSheetTextInput
              style={[actionStyles.input, { backgroundColor: colors.surface.onBgBase, color: colors.text.textBase, borderColor: colors.border.border3 }]}
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              placeholder="Ancient collection"
              placeholderTextColor={colors.text.textTertiary}
            />
          </View>
          <View style={actionStyles.newCollectionFooter}>
            <TouchableOpacity
              style={[actionStyles.confirmBtn, { backgroundColor: newCollectionName.trim() ? colors.background.bgInverse : colors.border.border3, marginBottom: 16 }]}
              onPress={handleCreateCollection}
              disabled={!newCollectionName.trim() || creatingCollection}
              activeOpacity={0.8}
            >
              {creatingCollection ? (
                <ActivityIndicator size="small" color={colors.text.textInverse} />
              ) : (
                <Text style={[actionStyles.confirmBtnText, { color: newCollectionName.trim() ? colors.text.textInverse : colors.text.textTertiary }]}>Create & Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>
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
  coinCircleImage: {
    width: '100%',
    height: '100%',
  },
  coinImagePlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
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
  dotsBtn: {
    padding: 4,
    marginLeft: 4,
  },
});

const actionStyles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  rowText: { fontSize: 16, fontWeight: '500' },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 18,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 20 },
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
  collectionName: { fontSize: 18, fontWeight: '500' },
  collectionCount: { fontSize: 15, marginTop: 4 },
  collectionCoins: { flexDirection: 'row', alignItems: 'center' },
  collectionCoinImg: { width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  confirmBtn: {
    borderRadius: 18,
    width: '90%',
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 18,
  },
  confirmBtnText: { fontSize: 17, fontWeight: '700' },
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
});
