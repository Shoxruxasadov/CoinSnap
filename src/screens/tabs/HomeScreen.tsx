import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Crown, Clock, Camera } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT = '#c9a227';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <View style={styles.logoInner} />
          </View>
          <View>
            <Text style={styles.appName}>Coin Snap</Text>
            <Text style={styles.tagline}>AI Powered coin scanner</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.proBtn}>
            <Crown size={16} color="#000" weight="fill" />
            <Text style={styles.proText}>PRO</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Clock size={20} color="#333" weight="regular" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.coinsPlaceholder}>
            <View style={styles.coin} />
            <View style={[styles.coin, styles.coin2]} />
            <View style={[styles.coin, styles.coin3]} />
          </View>
          <Text style={styles.cardTitle}>Identify Any Currency</Text>
          <Text style={styles.cardSubtitle}>Tap to scan button below and start scanning.</Text>
          <TouchableOpacity style={styles.identifyBtn} activeOpacity={0.8}>
            <Camera size={20} color="#fff" weight="regular" />
            <Text style={styles.identifyText}>Identify Now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Meet Coin expert</Text>
          <View style={styles.expertRow}>
            <Text style={styles.expertText}>
              Your AI numismatist for instant, accurate coin insights.
            </Text>
            <View style={styles.expertAvatar} />
          </View>
        </View>

        <Text style={styles.blogTitle}>Collectors Blog</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.blogScroll}>
          <View style={styles.blogCard}>
            <View style={styles.blogImage} />
            <Text style={styles.blogCardTitle} numberOfLines={2}>
              Understanding Coin Rarity: What Makes a C...
            </Text>
          </View>
          <View style={styles.blogCard}>
            <View style={styles.blogImage} />
            <Text style={styles.blogCardTitle} numberOfLines={2}>
              Top 10 Coins to Collect in 2024
            </Text>
          </View>
        </ScrollView>
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
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: ACCENT,
    transform: [{ rotate: '45deg' }],
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  tagline: {
    fontSize: 12,
    color: '#666',
    marginTop: 0,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  proText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8e8e2',
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  coinsPlaceholder: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  coin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d4af37',
  },
  coin2: { backgroundColor: '#c0c0c0' },
  coin3: { backgroundColor: '#cd7f32' },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  identifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  identifyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  expertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expertText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  expertAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e0e0',
  },
  blogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  blogScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  blogCard: {
    width: 200,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  blogImage: {
    height: 100,
    backgroundColor: '#e8e8e2',
  },
  blogCardTitle: {
    padding: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});
