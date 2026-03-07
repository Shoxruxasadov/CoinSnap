import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Crown, Clock, Camera } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../theme/useThemeColors';
import { supabase } from '../../lib/supabase';
import type { BlogPost } from '../../types/blog';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/MainStack';

const HOME_BLOG_LIMIT = 6;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation();
  const stackNav = navigation.getParent() as NativeStackNavigationProp<MainStackParamList> | undefined;
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogLoading, setBlogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setBlogLoading(true);
    supabase
      .from('blog_posts')
      .select('id, created_at, updated_at, title, thumbnail_url, read_time_minutes, excerpt, content, url, sort_order, category_id')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(HOME_BLOG_LIMIT)
      .then(({ data, error }) => {
        if (cancelled) return;
        setBlogPosts((data as BlogPost[]) ?? []);
        setBlogLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const openSnapHistory = () => {
    stackNav?.navigate('SnapHistory');
  };
  const openBlog = () => stackNav?.navigate('Blog');
  const openBlogItem = (post: BlogPost) => stackNav?.navigate('BlogItem', { post });

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgBaseElevated }]}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
       
          <Image source={require('../../../assets/logo.png')} style={styles.logoIcon} />
          <View>
            <Text style={[styles.appName, { color: colors.text.textBase }]}>Coin Snap</Text>
            <Text style={[styles.tagline, { color: colors.text.textTertiary }]}>AI Powered coin scanner</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.proBtn, { backgroundColor: "#FFB900" }]}>
            <Crown size={19} color="#2E1B03" fill="#2E1B03" />
            <Text style={[styles.proText, { color: "#2E1B03" }]}>PRO</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.surface.onBgBase }]} onPress={openSnapHistory}>
            <Clock size={20} color={colors.text.textBase} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Identify Any Currency Card */}
        <View style={[styles.identifyCard, { backgroundColor: colors.surface.onBgBase }]}>
          <Image
            source={require('../../../assets/home/coins.png')}
            style={styles.coinsImage}
            resizeMode="contain"
          />
          <Text style={[styles.cardTitle, { color: colors.text.textBase }]}>Identify Any Currency</Text>
          <Text style={[styles.cardSubtitle, { color: colors.text.textTertiary }]}>
            Tap to scan button below and start{'\n'}scanning.
          </Text>
          <TouchableOpacity style={[styles.identifyBtn, { backgroundColor: colors.background.bgInverse }]} activeOpacity={0.8}>
            <Camera size={24} color={colors.text.textInverse} />
            <Text style={[styles.identifyText, { color: colors.text.textInverse }]}>Identify Now</Text>
          </TouchableOpacity>
        </View>

        {/* Meet Coin Expert Card */}
        <View style={[styles.expertCard, { backgroundColor: colors.surface.onBgBase }]}>
          <View style={styles.expertContent}>
            <Text style={[styles.expertTitle, { color: colors.text.textBase }]}>Meet Coin expert</Text>
            <Text style={[styles.expertDescription, { color: colors.text.textAlt }]}>
              Your AI numismatist for instant, accurate coin insights.
            </Text>
          </View>
          <Image
            source={require('../../../assets/home/expert.png')}
            style={styles.expertImage}
            resizeMode="contain"
          />
        </View>

        {/* Collectors Blog */}
        <View style={styles.blogSection}>
          <Text style={[styles.blogTitle, { color: colors.text.textBase }]}>Collectors Blog</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.blogScroll} contentContainerStyle={styles.blogScrollContent}>
            {blogLoading ? (
              <View style={[styles.blogCard, styles.blogCardLoading, { backgroundColor: colors.surface.onBgBase }]}>
                <ActivityIndicator size="small" color={colors.text.textBrand} />
              </View>
            ) : blogPosts.length === 0 ? (
              <View style={[styles.blogCard, { backgroundColor: colors.surface.onBgBase }]}>
                <Text style={[styles.blogCardTitle, { color: colors.text.textTertiary }]}>No posts yet</Text>
              </View>
            ) : (
              blogPosts.map((post) => (
                <Pressable
                  key={post.id}
                  style={[styles.blogCard, { backgroundColor: colors.surface.onBgBase }]}
                  onPress={() => openBlogItem(post)}
                >
                  {post.thumbnail_url ? (
                    <Image source={{ uri: post.thumbnail_url }} style={styles.blogCardImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.blogCardImage, { backgroundColor: colors.border.border3 }]} />
                  )}
                  <View style={styles.blogCardTextWrap}>
                    <Text style={[styles.blogCardTitle, { color: colors.text.textBase }]} numberOfLines={2}>
                      {post.title}
                    </Text>
                    <Text style={[styles.blogCardReadTime, { color: colors.text.textTertiary }]}>
                      {post.read_time_minutes ? `${post.read_time_minutes} min read` : '1 min read'}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
          <TouchableOpacity
            style={[styles.seeAllBtn, { borderColor: colors.border.border2 }]}
            onPress={openBlog}
            activeOpacity={0.8}
          >
            <Text style={[styles.seeAllText, { color: colors.text.textBase }]}>See all</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  logoInner: {
    width: 14,
    height: 14,
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  proBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 50,
    gap: 5,
    height: 38,
  },
  proText: {
    fontSize: 16,
    fontWeight: '700',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  identifyCard: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  coinsImage: {
    width: 180,
    height: 100,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 38,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 28,
  },
  identifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
    width: '100%',
  },
  identifyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  expertCard: {
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  expertContent: {
    flex: 1,
    padding: 12,
  },
  expertTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '600',
    marginBottom: 4,
  },
  expertDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  expertImage: {
    width: 100,
    height: "100%",
    marginRight: -5,
    marginBottom: -2,
  },
  blogSection: {
    marginBottom: 24,
  },
  blogTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  blogScroll: {
    marginHorizontal: -20,
  },
  blogScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  blogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 280,
    marginRight: 12,
    borderRadius: 12,
    padding: 12,
  },
  blogCardImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  blogCardTextWrap: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  blogCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  blogCardReadTime: {
    fontSize: 13,
    fontWeight: '400',
  },
  blogCardLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 280,
  },
  seeAllBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
