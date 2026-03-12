import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Heart, MessageCircle, ArrowUpDown, Plus, X, Check, MoreVertical, Pencil, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/MainStack';
import { supabase } from '../../lib/supabase';
import { useSupabaseSession } from '../../lib/useSupabaseSession';
import {
  CommunityPost,
  SortOption,
  getDisplayName,
  getAvatarUrl,
  formatPostDate,
  formatPostTime,
} from '../../types/community';
import { triggerSelection } from '../../lib/haptics';
import { useThemeColors } from '../../theme/useThemeColors';
import { ImageViewer } from '../../components/ImageViewer';

type StackNav = NativeStackNavigationProp<MainStackParamList>;

function PostCard({
  post,
  onPress,
  onLike,
  onMorePress,
  onImagePress,
  isOwnPost,
  currentUserId,
  colors,
}: {
  post: CommunityPost;
  onPress: () => void;
  onLike: (postId: number, isLiked: boolean) => void;
  onMorePress?: () => void;
  onImagePress?: (urls: string[], index: number) => void;
  isOwnPost: boolean;
  currentUserId?: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const avatarUrl = getAvatarUrl(post.user);
  const name = getDisplayName(post.user);
  const isLiked = post.is_liked ?? false;

  const handleLike = () => {
    triggerSelection();
    onLike(post.id, isLiked);
  };

  const urls = post.image_urls ?? [];

  return (
    <View style={[styles.postCard, { backgroundColor: colors.surface.onBgBase }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={styles.postHeader}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.border.border3 }]} />
          )}
          <View style={[styles.postMeta, { flex: 1 }]}>
            <Text style={[styles.postName, { color: colors.text.textBase }]}>{name}</Text>
            <Text style={[styles.postDate, { color: colors.text.textTertiary }]}>{formatPostDate(post.created_at)} {formatPostTime(post.created_at)}</Text>
          </View>
          {isOwnPost && onMorePress && (
            <TouchableOpacity
              style={styles.moreBtn}
              onPress={(e) => {
                e?.stopPropagation?.();
                triggerSelection();
                onMorePress();
              }}
              hitSlop={8}
            >
              <MoreVertical size={22} color={colors.text.textBase} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.postText, { color: colors.text.textBase }]} numberOfLines={4}>
          {post.content}
        </Text>
      </TouchableOpacity>
      {urls.length > 0 && (
        <TouchableOpacity style={styles.postImages} onPress={onPress} activeOpacity={1}>
          {urls.slice(0, 2).map((url, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                triggerSelection();
                onImagePress?.(urls, idx);
              }}
              activeOpacity={0.9}
            >
              <Image source={{ uri: url }} style={[styles.postImage, { backgroundColor: colors.background.bgBaseElevated }]} />
            </TouchableOpacity>
          ))}
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.postActions} onPress={onPress} activeOpacity={0.7}>
        <TouchableOpacity style={styles.actionRow} onPress={handleLike}>
          <Heart
            size={18}
            color={isLiked ? colors.state.red : colors.text.textAlt}
            fill={isLiked ? colors.state.red : 'transparent'}
          />
          <Text style={[styles.actionText, { color: colors.text.textAlt }, isLiked && { color: colors.state.red }]}>
            {post.likes_count ?? 0}
          </Text>
        </TouchableOpacity>
        <View style={styles.actionRow}>
          <MessageCircle size={18} color={colors.text.textAlt} />
          <Text style={[styles.actionText, { color: colors.text.textAlt }]}>{post.replies_count ?? 0}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'all', label: 'All posts' },
  { key: 'my_posts', label: 'My Posts' },
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'high_rated', label: 'High rated' },
];

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation();
  const stackNav = navigation.getParent() as StackNav | undefined;
  const { session } = useSupabaseSession();
  const currentUserId = session?.user?.id;

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('all');
  const [totalUsers, setTotalUsers] = useState(10000);

  const sortSheetRef = useRef<BottomSheetModal>(null);
  const postOptionsSheetRef = useRef<BottomSheetModal>(null);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerUrls, setImageViewerUrls] = useState<string[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const maxSortSheetHeight = useMemo(() => Dimensions.get('window').height * 0.6, []);

  const renderSortBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const openSortSheet = useCallback(() => {
    sortSheetRef.current?.present();
  }, []);

  const closeSortSheet = useCallback(() => {
    sortSheetRef.current?.dismiss();
  }, []);

  const fetchPosts = useCallback(async (overrideSort?: SortOption) => {
    const sort = overrideSort ?? sortOption;
    try {
      let query = supabase.from('community_posts').select('*');

      if (sort === 'my_posts' && currentUserId) {
        query = query.eq('user_id', currentUserId);
      }

      if (sort === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data: postsData, error } = await query;
      if (error) throw error;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      const userIds = [...new Set(postsData.map((p: CommunityPost) => p.user_id))];
      const postIds = postsData.map((p: CommunityPost) => p.id);

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesMap: Record<string, { full_name?: string; avatar_url?: string }> = {};
      (profilesData ?? []).forEach((p: { id: string; full_name?: string; avatar_url?: string }) => {
        profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      });

      const { data: likesCount } = await supabase
        .from('community_post_likes')
        .select('post_id')
        .in('post_id', postIds);

      const { data: repliesCount } = await supabase
        .from('community_replies')
        .select('post_id')
        .in('post_id', postIds);

      let userLikes: number[] = [];
      if (currentUserId) {
        const { data: myLikes } = await supabase
          .from('community_post_likes')
          .select('post_id')
          .eq('user_id', currentUserId)
          .in('post_id', postIds);
        userLikes = (myLikes ?? []).map((l: { post_id: number }) => l.post_id);
      }

      const likesMap: Record<number, number> = {};
      (likesCount ?? []).forEach((l: { post_id: number }) => {
        likesMap[l.post_id] = (likesMap[l.post_id] ?? 0) + 1;
      });

      const repliesMap: Record<number, number> = {};
      (repliesCount ?? []).forEach((r: { post_id: number }) => {
        repliesMap[r.post_id] = (repliesMap[r.post_id] ?? 0) + 1;
      });

      const session = (await supabase.auth.getSession()).data?.session;
      let enrichedPosts: CommunityPost[] = postsData.map((post: CommunityPost) => {
        const profile = profilesMap[post.user_id];
        const isCurrentUser = post.user_id === currentUserId;
        const meta = session?.user?.user_metadata;
        return {
          ...post,
          user: {
            id: post.user_id,
            user_metadata: {
              full_name: isCurrentUser && meta
                ? (meta.full_name ?? meta.name ?? profile?.full_name)
                : profile?.full_name,
              avatar_url: isCurrentUser && meta
                ? (meta.avatar_url ?? meta.picture ?? profile?.avatar_url)
                : profile?.avatar_url,
            },
          },
          likes_count: likesMap[post.id] ?? 0,
          replies_count: repliesMap[post.id] ?? 0,
          is_liked: userLikes.includes(post.id),
        };
      });

      if (sort === 'high_rated') {
        enrichedPosts = enrichedPosts.sort(
          (a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0)
        );
      }

      setPosts(enrichedPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sortOption, currentUserId]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleLike = async (postId: number, isLiked: boolean) => {
    if (!currentUserId) {
      navigation.dispatch(CommonActions.navigate({ name: 'GetStarted' }));
      return;
    }

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_liked: !isLiked,
              likes_count: (p.likes_count ?? 0) + (isLiked ? -1 : 1),
            }
          : p
      )
    );

    try {
      if (isLiked) {
        await supabase
          .from('community_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);
      } else {
        await supabase
          .from('community_post_likes')
          .insert({ post_id: postId, user_id: currentUserId });
      }
    } catch (err) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_liked: isLiked,
                likes_count: (p.likes_count ?? 0) + (isLiked ? 1 : -1),
              }
            : p
        )
      );
    }
  };

  const handlePostPress = (post: CommunityPost) => {
    stackNav?.navigate('CommunityPost', { post });
  };

  const handleNewPost = () => {
    triggerSelection();
    if (!currentUserId) {
      navigation.dispatch(CommonActions.navigate({ name: 'GetStarted' }));
      return;
    }
    stackNav?.navigate('CommunityNewPost', {});
  };

  const openImageViewer = (urls: string[], index: number) => {
    setImageViewerUrls(urls);
    setImageViewerIndex(index);
    setImageViewerVisible(true);
  };

  const handleSortSelect = (option: SortOption) => {
    triggerSelection();
    setSortOption(option);
    closeSortSheet();
    setLoading(true);
    fetchPosts(option);
  };

  const openPostOptions = useCallback((post: CommunityPost) => {
    setSelectedPost(post);
    postOptionsSheetRef.current?.present();
  }, []);

  const closePostOptionsSheet = useCallback(() => {
    postOptionsSheetRef.current?.dismiss();
    setSelectedPost(null);
  }, []);

  const handleEditPost = useCallback(() => {
    if (!selectedPost) return;
    closePostOptionsSheet();
    stackNav?.navigate('CommunityNewPost', { post: selectedPost });
  }, [selectedPost, closePostOptionsSheet, stackNav]);

  const handleDeletePost = useCallback(() => {
    if (!selectedPost || !currentUserId || selectedPost.user_id !== currentUserId) return;
    Alert.alert(
      'Delete post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel', onPress: closePostOptionsSheet },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            closePostOptionsSheet();
            try {
              await supabase.from('community_posts').delete().eq('id', selectedPost.id);
              setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
            } catch (err) {
              console.error('Delete post error:', err);
            }
            setSelectedPost(null);
          },
        },
      ]
    );
  }, [selectedPost, currentUserId, closePostOptionsSheet]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgBaseElevated }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text.textBase }]}>Community</Text>
          <Text style={[styles.subtitle, { color: colors.text.textAlt }]}>Discuss with {totalUsers.toLocaleString()}+ collectors</Text>
        </View>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => {
            triggerSelection();
            openSortSheet();
          }}
        >
          <ArrowUpDown size={22} color={colors.text.textBase} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text.textBase} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text.textBase} />
          }
        >
          {posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MessageCircle size={48} color={colors.border.border4} />
              <Text style={[styles.emptyText, { color: colors.text.textBase }]}>No posts yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.text.textAlt }]}>Be the first to share something!</Text>
            </View>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPress={() => handlePostPress(post)}
                onLike={handleLike}
                onMorePress={() => openPostOptions(post)}
                onImagePress={openImageViewer}
                isOwnPost={currentUserId !== undefined && post.user_id === currentUserId}
                currentUserId={currentUserId}
                colors={colors}
              />
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: 20, backgroundColor: colors.background.bgInverse }]}
        onPress={handleNewPost}
        activeOpacity={0.8}
      >
        <Plus size={28} color={colors.text.textInverse} strokeWidth={2.5} />
      </TouchableOpacity>

      <ImageViewer
        visible={imageViewerVisible}
        imageUrls={imageViewerUrls}
        initialIndex={imageViewerIndex}
        onClose={() => setImageViewerVisible(false)}
      />

      {/* Sort Bottom Sheet */}
      <BottomSheetModal
        ref={sortSheetRef}
        enableDynamicSizing
        maxDynamicContentSize={maxSortSheetHeight}
        enablePanDownToClose
        backdropComponent={renderSortBackdrop}
        backgroundStyle={{ backgroundColor: colors.background.bgAlt }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border4 }}
      >
        <BottomSheetView style={[styles.sortSheetContent, { paddingBottom: insets.bottom }]}>
          <View style={styles.sortHeader}>
            <Text style={[styles.sortTitle, { color: colors.text.textBase }]}>Sort by</Text>
            <TouchableOpacity onPress={closeSortSheet}>
              <X size={24} color={colors.text.textBase} />
            </TouchableOpacity>
          </View>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={styles.sortOption}
              onPress={() => handleSortSelect(opt.key)}
            >
              <Text style={[styles.sortOptionText, { color: colors.text.textBase }]}>{opt.label}</Text>
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: colors.border.border4 },
                  sortOption === opt.key && { backgroundColor: colors.text.textBrand, borderColor: colors.text.textBrand },
                ]}
              >
                {sortOption === opt.key && <Check size={14} color={colors.text.textWhite} strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          ))}
        </BottomSheetView>
      </BottomSheetModal>

      {/* Post options (Edit / Delete) */}
      <BottomSheetModal
        ref={postOptionsSheetRef}
        enableDynamicSizing
        maxDynamicContentSize={maxSortSheetHeight}
        enablePanDownToClose
        backdropComponent={renderSortBackdrop}
        backgroundStyle={{ backgroundColor: colors.background.bgAlt }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border4 }}
      >
        <BottomSheetView style={[styles.sortSheetContent, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity style={styles.postOptionRow} onPress={handleEditPost}>
            <Pencil size={22} color={colors.text.textBase} />
            <Text style={[styles.postOptionText, { color: colors.text.textBase }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.postOptionRow, { borderTopWidth: 1, borderTopColor: colors.border.border2 }]}
            onPress={handleDeletePost}
          >
            <Trash2 size={22} color={colors.state.red} />
            <Text style={[styles.postOptionText, { color: colors.state.red }]}>Delete</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
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
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  sortBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  postCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {},
  postMeta: {
    marginLeft: 12,
  },
  moreBtn: {
    padding: 8,
    marginRight: -8,
  },
  postOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 4,
  },
  postOptionText: {
    fontSize: 17,
    fontWeight: '500',
  },
  postName: {
    fontSize: 16,
    fontWeight: '600',
  },
  postDate: {
    fontSize: 13,
    marginTop: 2,
  },
  postText: {
    fontSize: 15,
    lineHeight: 22,
  },
  postImages: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignSelf: 'stretch',
  },
  postImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  postActions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  sortSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sortTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  sortOptionText: {
    fontSize: 16,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
