import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
} from 'react-native';
import { LayoutGrid, List, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/MainStack';
import { useThemeColors } from '../../theme/useThemeColors';
import { supabase } from '../../lib/supabase';
import { useSupabaseSession } from '../../lib/useSupabaseSession';

export type CollectionRow = {
  id: number;
  name: string;
  description: string | null;
  coin_ids: number[];
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type CoinImageRow = {
  id: number;
  front_image_url: string | null;
  back_image_url: string | null;
};

type ViewMode = 'grid' | 'list';

function CollectionCard({
  title,
  items,
  lastTwoCoins,
  colors,
  mode,
  onPress,
}: {
  title: string;
  items: number;
  lastTwoCoins: CoinImageRow[];
  colors: ReturnType<typeof useThemeColors>;
  mode: ViewMode;
  onPress: () => void;
}) {
  const isList = mode === 'list';
  const cardStyle = isList ? styles.collectionCardList : styles.collectionCard;
  const coinsStackStyle = isList ? styles.coinsStackList : styles.coinsStack;
  const miniCoinStyle = isList ? styles.miniCoinList : styles.miniCoin;
  const Wrapper = Pressable;

  const imageUrls = useMemo(() => {
    const urls: (string | null)[] = [];
    lastTwoCoins.forEach((c) => {
      if (c.front_image_url) urls.push(c.front_image_url);
      if (c.back_image_url) urls.push(c.back_image_url);
    });
    return urls;
  }, [lastTwoCoins]);

  const renderCoins = () => {
    if (imageUrls.length === 0) {
      return (
        <>
          <View style={[miniCoinStyle, styles.coinPlaceholder, { borderColor: colors.surface.onBgBase, backgroundColor: colors.border.border3 }]} />
          <View style={[miniCoinStyle, styles.coinPlaceholder, { borderColor: colors.surface.onBgBase, backgroundColor: colors.border.border3 }]} />
          <View style={[miniCoinStyle, styles.coinPlaceholder, { borderColor: colors.surface.onBgBase, backgroundColor: colors.border.border3 }]} />
          <View style={[miniCoinStyle, styles.coinPlaceholder, { borderColor: colors.surface.onBgBase, backgroundColor: colors.border.border3 }]} />
        </>
      );
    }
    return imageUrls.map((url, i) => (
      <View key={i} style={[miniCoinStyle, { borderColor: colors.background.bgWhite, overflow: 'hidden' }]}>
        {url ? (
          <Image source={{ uri: url }} style={styles.miniCoinImage} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.coinPlaceholder, { backgroundColor: colors.border.border3 }]} />
        )}
      </View>
    ));
  };

  if (isList) {
    return (
      <Wrapper style={[cardStyle, { backgroundColor: colors.surface.onBgBase }]} onPress={onPress}>
        <View style={styles.collectionCardListContent}>
          <View style={styles.collectionCardListLeft}>
            <Text style={[styles.collectionTitle, { color: colors.text.textBase }]} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
            <Text style={[styles.collectionMeta, styles.collectionMetaList, { color: colors.text.textAlt }]}>{items} items</Text>
          </View>
          <View style={coinsStackStyle}>
            {renderCoins()}
          </View>
        </View>
      </Wrapper>
    );
  }

  return (
    <Wrapper style={[cardStyle, { backgroundColor: colors.surface.onBgBase, borderColor: colors.border.border3 }]} onPress={onPress}>
      <Text style={[styles.collectionTitle, { color: colors.text.textBase }]} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
      <Text style={[styles.collectionMeta, { color: colors.text.textAlt }]}>{items} items</Text>
      <View style={coinsStackStyle}>
        {renderCoins()}
      </View>
    </Wrapper>
  );
}

export default function CollectionsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation();
  const stackNav = navigation.getParent() as NativeStackNavigationProp<MainStackParamList> | undefined;
  const { session } = useSupabaseSession();
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [coinsMap, setCoinsMap] = useState<Record<number, CoinImageRow>>({});
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [creating, setCreating] = useState(false);
  const isGrid = viewMode === 'grid';

  const openCollectionDetail = (c: CollectionRow) => {
    stackNav?.navigate('CollectionDetail', { collection: c });
  };

  const fetchCollections = () => {
    if (!session?.user?.id) return;
    supabase
      .from('collections')
      .select('id, name, description, coin_ids, user_id, created_at, updated_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) return;
        setCollections((data as CollectionRow[]) ?? []);
      });
  };

  useEffect(() => {
    if (!session?.user?.id) {
      setCollections([]);
      setCoinsMap({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('collections')
      .select('id, name, description, coin_ids, user_id, created_at, updated_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (error) return;
        setCollections((data as CollectionRow[]) ?? []);
      });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const allCoinIds = useMemo(() => {
    const set = new Set<number>();
    collections.forEach((c) => (c.coin_ids ?? []).forEach((id) => set.add(id)));
    return Array.from(set).sort((a, b) => a - b);
  }, [collections]);

  useEffect(() => {
    if (allCoinIds.length === 0) {
      setCoinsMap({});
      return;
    }
    let cancelled = false;
    supabase
      .from('coins')
      .select('id, front_image_url, back_image_url')
      .in('id', allCoinIds)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setCoinsMap({});
          return;
        }
        const map: Record<number, CoinImageRow> = {};
        (data as CoinImageRow[] ?? []).forEach((row) => {
          map[row.id] = row;
        });
        setCoinsMap(map);
      });
    return () => { cancelled = true; };
  }, [allCoinIds.join(',')]);

  const getLastTwoCoins = (collection: CollectionRow): CoinImageRow[] => {
    const ids = collection.coin_ids ?? [];
    const lastTwo = ids.slice(-2);
    return lastTwo.map((id) => coinsMap[id]).filter(Boolean);
  };

  const openModal = () => {
    setCollectionName('');
    setModalVisible(true);
  };

  const closeModal = () => setModalVisible(false);

  const handleCreate = async () => {
    const name = collectionName.trim();
    if (!name) return;
    if (!session?.user?.id) {
      Alert.alert('Error', 'Please sign in to create a collection.');
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('collections').insert({
      user_id: session.user.id,
      name,
      coin_ids: [],
    });
    setCreating(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    closeModal();
    fetchCollections();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgBaseElevated }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.textBase }]}>Collections</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={[styles.iconBtn]}
            onPress={() => setViewMode('grid')}
          >
            <LayoutGrid size={22} color={isGrid ? colors.text.textBrand : colors.text.textAlt} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn]}
            onPress={() => setViewMode('list')}
          >
            <List size={22} color={!isGrid ? colors.text.textBrand : colors.text.textAlt} />
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
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {isGrid ? (
            <View style={styles.grid}>
              {collections.map((c) => (
                <CollectionCard
                  key={c.id}
                  title={c.name}
                  items={c.coin_ids?.length ?? 0}
                  lastTwoCoins={getLastTwoCoins(c)}
                  colors={colors}
                  mode="grid"
                  onPress={() => openCollectionDetail(c)}
                />
              ))}
              <TouchableOpacity style={[styles.newFolder, { borderColor: colors.border.borderBrandTint }]} onPress={openModal} activeOpacity={0.8}>
                <Plus size={36} color={colors.text.textTertiary} style={styles.newFolderPlus} />
                <Text style={[styles.newFolderTitle, { color: colors.text.textBaseTint }]}>New Folder</Text>
                <Text style={[styles.newFolderHint, { color: colors.text.textTertiary }]}>Tap to create new</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.list}>
              {collections.map((c) => (
                <CollectionCard
                  key={c.id}
                  title={c.name}
                  items={c.coin_ids?.length ?? 0}
                  lastTwoCoins={getLastTwoCoins(c)}
                  colors={colors}
                  mode="list"
                  onPress={() => openCollectionDetail(c)}
                />
              ))}
              <TouchableOpacity style={[styles.newFolderList, { borderColor: colors.border.border3 }]} onPress={openModal} activeOpacity={0.8}>
                <Plus size={36} color={colors.text.textTertiary} style={styles.newFolderPlus} />
                <Text style={[styles.newFolderTitle, { color: colors.text.textTertiary }]}>New Folder</Text>
                <Text style={[styles.newFolderHint, { color: colors.text.textTertiary }]}>Tap to create new</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboard}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: colors.background.bgWhite }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text.textBase }]}>New Collection</Text>
                  <TouchableOpacity onPress={closeModal} hitSlop={12} style={styles.modalCloseBtn}>
                    <X size={24} color={colors.text.textBase} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.modalLabel, { color: colors.text.textBase }]}>Collection name</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.surface.onBgAlt,
                      color: colors.text.textBase,
                      borderColor: colors.border.border3,
                    },
                  ]}
                  placeholder="Ancient collection"
                  placeholderTextColor={colors.text.textTertiary}
                  value={collectionName}
                  onChangeText={setCollectionName}
                  autoCapitalize="words"
                  editable={!creating}
                />
                <TouchableOpacity
                  style={[styles.modalCreateBtn, { backgroundColor: colors.background.bgInverse }]}
                  onPress={handleCreate}
                  disabled={creating || !collectionName.trim()}
                  activeOpacity={0.8}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color={colors.text.textInverse} />
                  ) : (
                    <Text style={[styles.modalCreateBtnText, { color: colors.text.textWhite }]}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    width: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  list: {
    gap: 12,
  },
  collectionCard: {
    width: '48.2%',
    borderRadius: 16,
    padding: 16,
  },
  collectionCardList: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  collectionCardListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collectionCardListLeft: {
    flex: 1,
  },
  collectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  collectionMeta: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 20,
  },
  collectionMetaList: {
    marginBottom: 0,
  },
  coinsStackList: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  coinsStack: {
    flexDirection: 'row',
    marginLeft: 4,
  },
  miniCoin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: -10,
    borderWidth: 2,
  },
  miniCoinList: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: -10,
    borderWidth: 2,
  },
  coinSilver: { backgroundColor: '#c0c0c0' },
  coinGold: { backgroundColor: '#d4af37' },
  coinPlaceholder: {},
  miniCoinImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  newFolder: {
    width: '47%',
    minWidth: 140,
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newFolderList: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  newFolderPlus: {
    marginBottom: 8,
  },
  newFolderTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  newFolderHint: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalKeyboard: {
    width: '100%',
    maxWidth: 340,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  modalCreateBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  modalCreateBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
