import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { SquaresFour, List, Plus } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT = '#c9a227';

const COLLECTIONS = [
  { id: '1', title: 'General', items: 4 },
  { id: '2', title: 'Ancient Collection', items: 4 },
];

function CollectionCard({ title, items }: { title: string; items: number }) {
  return (
    <View style={styles.collectionCard}>
      <Text style={styles.collectionTitle}>{title}</Text>
      <Text style={styles.collectionMeta}>{items} items</Text>
      <View style={styles.coinsStack}>
        <View style={[styles.miniCoin, styles.coinSilver]} />
        <View style={[styles.miniCoin, styles.coinGold]} />
        <View style={[styles.miniCoin, styles.coinSilver]} />
        <View style={[styles.miniCoin, styles.coinGold]} />
      </View>
    </View>
  );
}

export default function CollectionsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Collections</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <SquaresFour size={22} color="#333" weight="regular" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <List size={22} color="#333" weight="regular" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {COLLECTIONS.map((c) => (
            <CollectionCard key={c.id} title={c.title} items={c.items} />
          ))}
          <TouchableOpacity style={styles.newFolder} activeOpacity={0.8}>
            <Plus size={36} color="#999" weight="regular" style={styles.newFolderPlus} />
            <Text style={styles.newFolderTitle}>New Folder</Text>
            <Text style={styles.newFolderHint}>Tap to create new</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  collectionCard: {
    width: '47%',
    minWidth: 140,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  collectionMeta: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  coinsStack: {
    flexDirection: 'row',
    marginLeft: -4,
  },
  miniCoin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  coinSilver: { backgroundColor: '#c0c0c0' },
  coinGold: { backgroundColor: '#d4af37' },
  newFolder: {
    width: '47%',
    minWidth: 140,
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  newFolderPlus: {
    marginBottom: 8,
  },
  newFolderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  newFolderHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});
