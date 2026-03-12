import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useThemeColors, useEffectiveColorScheme } from '../theme/useThemeColors';
import { supabase } from '../lib/supabase';
import type { BlogPost, BlogCategory } from '../types/blog';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainStack';

const TAB_ROW_PADDING = 16;
const INDICATOR_DURATION = 250;
const INDICATOR_EASING = Easing.bezier(0.33, 1, 0.68, 1);

type Nav = NativeStackNavigationProp<MainStackParamList, 'Blog'>;

function BlogCard({
  post,
  onPress,
  colors,
}: {
  post: BlogPost;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const readTime = post.read_time_minutes ? `${post.read_time_minutes} min read` : '1 min read';
  const imageUrl = post.thumbnail_url;
  return (
    <Pressable
      style={[styles.blogCard, { backgroundColor: colors.surface.onBgBase }]}
      onPress={onPress}
    >
      <View style={styles.blogThumbWrap}>
        {imageUrl ? (
          <View style={{ width: 64, height: 64, position: 'relative' }}>
            <View
              style={[
                styles.blogThumb,
                styles.blogThumbEmpty,
                StyleSheet.absoluteFill,
                { backgroundColor: colors.border.border3 },
              ]}
            />
            <Image
              source={{ uri: imageUrl }}
              style={[styles.blogThumb, StyleSheet.absoluteFill, { borderRadius: 12 }]}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={[styles.blogThumb, styles.blogThumbEmpty, { backgroundColor: colors.border.border3 }]} />
        )}
      </View>
      <View style={styles.blogCardBody}>
        <Text
          style={[styles.blogCardTitle, { color: colors.text.textBase }]}
          numberOfLines={2}
        >
          {post.title}
        </Text>
        <Text style={[styles.blogCardMeta, { color: colors.text.textTertiary }]}>
          {readTime}
        </Text>
      </View>
    </Pressable>
  );
}

export default function BlogScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  const tabs = useMemo(() => {
    const list: { id: number | null; label: string }[] = [{ id: null, label: 'All' }];
    categories.forEach((c) => list.push({ id: c.id, label: c.name }));
    return list;
  }, [categories]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('blog_categories')
      .select('id, created_at, name, sort_order')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        setCategories((data as BlogCategory[]) ?? []);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from('blog_posts')
      .select('id, created_at, updated_at, title, thumbnail_url, read_time_minutes, excerpt, content, url, sort_order, category_id')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setPosts([]);
        } else {
          setPosts((data as BlogPost[]) ?? []);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const next = new Array(tabs.length).fill(null);
    tabLayouts.current.forEach((l, i) => { if (i < next.length) next[i] = l; });
    tabLayouts.current = next;
  }, [tabs.length]);

  const postsForTab = useMemo(() => {
    if (activeTab === 0) return posts;
    const categoryId = tabs[activeTab]?.id;
    if (categoryId == null) return posts;
    return posts.filter((p) => p.category_id === categoryId);
  }, [posts, activeTab, tabs]);

  const animateToTab = (index: number) => {
    const layout = tabLayouts.current[index];
    if (!layout) return;
    Animated.parallel([
      Animated.timing(indicatorLeft, {
        toValue: layout.x,
        duration: INDICATOR_DURATION,
        easing: INDICATOR_EASING,
        useNativeDriver: false,
      }),
      Animated.timing(indicatorWidth, {
        toValue: layout.width,
        duration: INDICATOR_DURATION,
        easing: INDICATOR_EASING,
        useNativeDriver: false,
      }),
    ]).start();
  };

  useEffect(() => {
    animateToTab(activeTab);
  }, [activeTab]);

  const handleTabLayout = (index: number, e: { nativeEvent: { layout: { x: number; width: number } } }) => {
    const { x, width } = e.nativeEvent.layout;
    tabLayouts.current[index] = { x, width };
    if (index === activeTab) {
      indicatorLeft.setValue(x);
      indicatorWidth.setValue(width);
      animateToTab(index);
    }
  };

  const colorScheme = useEffectiveColorScheme();
  const statusBarStyle = colorScheme === 'dark' ? 'light' : 'dark';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgBaseElevated }]}>
      <StatusBar style={statusBarStyle} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <ChevronLeft size={24} color={colors.text.textBase} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.textBase }]}>Blog</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.tabRow, { paddingHorizontal: TAB_ROW_PADDING }]}>
        <View style={[styles.tabRail, { backgroundColor: colors.border.border3 }]} />
        <View style={styles.tabRowInner}>
          {tabs.map((tab, idx) => (
            <Pressable
              key={tab.id ?? 'all'}
              style={styles.tab}
              onLayout={(e) => handleTabLayout(idx, e)}
              onPress={() => setActiveTab(idx)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === idx ? colors.text.textBrand : colors.text.textTertiary },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
          <Animated.View
            style={[
              styles.tabIndicatorAbsolute,
              {
                backgroundColor: colors.text.textBrand,
                left: indicatorLeft,
                width: indicatorWidth,
              },
            ]}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface.onBgBase }]}>
            <ActivityIndicator size="small" color={colors.text.textBase} />
          </View>
        ) : postsForTab.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface.onBgBase }]}>
            <Text style={[styles.emptyCardText, { color: colors.text.textTertiary }]}>
              No posts yet.
            </Text>
          </View>
        ) : (
          postsForTab.map((post) => (
            <BlogCard
              key={post.id}
              post={post}
              colors={colors}
              onPress={() => navigation.navigate('BlogItem', { post })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerSpacer: { width: 44 },
  tabRow: {
    position: 'relative',
    paddingBottom: 8,
    overflow: 'visible',
  },
  tabRail: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    right: 0,
    height: 3,
    borderRadius: 1,
  },
  tabRowInner: { flexDirection: 'row', gap: 24, position: 'relative' },
  tab: { paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
  tabText: { fontSize: 15, fontWeight: '600' },
  tabIndicatorAbsolute: {
    position: 'absolute',
    bottom: -8,
    height: 3,
    borderRadius: 2,
    zIndex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 20 },
  blogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  blogThumbWrap: { marginRight: 12 },
  blogThumb: { width: 64, height: 64, borderRadius: 12 },
  blogThumbEmpty: {},
  blogCardBody: { flex: 1, minWidth: 0 },
  blogCardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  blogCardMeta: { fontSize: 13 },
  emptyCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyCardText: { fontSize: 15, textAlign: 'center' },
});
