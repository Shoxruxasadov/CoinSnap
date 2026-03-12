import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Pressable,
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Heart, MessageCircle, ChevronLeft, Send, MoreVertical, Pencil, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainStack';
import { supabase } from '../lib/supabase';
import { useSupabaseSession } from '../lib/useSupabaseSession';
import {
  CommunityPost,
  CommunityReply,
  getDisplayName,
  getAvatarUrl,
  formatPostDate,
  formatPostTime,
} from '../types/community';
import { triggerSelection, triggerImpact } from '../lib/haptics';
import { useThemeColors } from '../theme/useThemeColors';
import { ImageViewer } from '../components/ImageViewer';

type StackNav = NativeStackNavigationProp<MainStackParamList>;
type RouteType = RouteProp<MainStackParamList, 'CommunityPost'>;

function ReplyCard({
  reply,
  postAuthorName,
  onLike,
  currentUserId,
  colors,
}: {
  reply: CommunityReply;
  postAuthorName: string;
  onLike: (replyId: number, isLiked: boolean) => void;
  currentUserId?: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const avatarUrl = getAvatarUrl(reply.user);
  const name = getDisplayName(reply.user);
  const isLiked = reply.is_liked ?? false;

  return (
    <View style={[styles.replyCard, { backgroundColor: colors.surface.onBgBase }]}>
      <View style={styles.replyHeader}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.replyAvatar} />
        ) : (
          <View style={[styles.replyAvatar, styles.avatarPlaceholder, { backgroundColor: colors.border.border3 }]} />
        )}
        <View style={styles.replyMeta}>
          <Text style={[styles.replyName, { color: colors.text.textBase }]}>{name}</Text>
          <Text style={[styles.replyingTo, { color: colors.text.textTertiary }]}>
            Replying to <Text style={{ color: colors.text.textBrand }}>{postAuthorName}</Text>
          </Text>
        </View>
      </View>
      <Text style={[styles.replyText, { color: colors.text.textBase }]}>{reply.content}</Text>
      <View style={styles.replyFooter}>
        <Text style={[styles.replyDate, { color: colors.text.textTertiary }]}>{formatPostDate(reply.created_at)} {formatPostTime(reply.created_at)}</Text>
        <TouchableOpacity
          style={styles.replyLikeBtn}
          onPress={() => {
            triggerSelection();
            onLike(reply.id, isLiked);
          }}
        >
          <Heart
            size={16}
            color={isLiked ? colors.state.red : colors.text.textAlt}
            fill={isLiked ? colors.state.red : 'transparent'}
          />
          <Text style={[styles.replyLikeCount, { color: colors.text.textAlt }, isLiked && { color: colors.state.red }]}>
            {reply.likes_count ?? 0}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CommunityPostScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation<StackNav>();
  const route = useRoute<RouteType>();
  const { session } = useSupabaseSession();
  const currentUserId = session?.user?.id;

  const initialPost = route.params.post;
  const [post, setPost] = useState<CommunityPost>(initialPost);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerUrls, setImageViewerUrls] = useState<string[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  const postOptionsSheetRef = useRef<BottomSheetModal>(null);
  const maxOptionsSheetHeight = useMemo(() => Dimensions.get('window').height * 0.4, []);
  const isOwnPost = currentUserId !== undefined && post.user_id === currentUserId;

  const postAuthorName = getDisplayName(post.user);

  const renderPostOptionsBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior="close" />
    ),
    []
  );

  const closePostOptionsSheet = useCallback(() => {
    postOptionsSheetRef.current?.dismiss();
  }, []);

  const handleEditPost = useCallback(() => {
    closePostOptionsSheet();
    navigation.navigate('CommunityNewPost', { post });
  }, [closePostOptionsSheet, navigation, post]);

  const handleDeletePost = useCallback(() => {
    if (!currentUserId || post.user_id !== currentUserId) return;
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
              await supabase.from('community_posts').delete().eq('id', post.id);
              navigation.goBack();
            } catch (err) {
              console.error('Delete post error:', err);
            }
          },
        },
      ]
    );
  }, [currentUserId, post.user_id, post.id, closePostOptionsSheet, navigation]);

  const fetchData = useCallback(async () => {
    try {
      const { data: repliesData, error } = await supabase
        .from('community_replies')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!repliesData || repliesData.length === 0) {
        setReplies([]);
        return;
      }

      const replyIds = repliesData.map((r: CommunityReply) => r.id);
      const userIds = [...new Set(repliesData.map((r: CommunityReply) => r.user_id))];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesMap: Record<string, { full_name?: string; avatar_url?: string }> = {};
      (profilesData ?? []).forEach((p: { id: string; full_name?: string; avatar_url?: string }) => {
        profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      });

      const { data: { session } } = await supabase.auth.getSession();
      const meta = session?.user?.user_metadata;

      const { data: likesCount } = await supabase
        .from('community_reply_likes')
        .select('reply_id')
        .in('reply_id', replyIds);

      let userLikes: number[] = [];
      if (currentUserId) {
        const { data: myLikes } = await supabase
          .from('community_reply_likes')
          .select('reply_id')
          .eq('user_id', currentUserId)
          .in('reply_id', replyIds);
        userLikes = (myLikes ?? []).map((l: { reply_id: number }) => l.reply_id);
      }

      const likesMap: Record<number, number> = {};
      (likesCount ?? []).forEach((l: { reply_id: number }) => {
        likesMap[l.reply_id] = (likesMap[l.reply_id] ?? 0) + 1;
      });

      const enrichedReplies: CommunityReply[] = repliesData.map((reply: CommunityReply) => {
        const profile = profilesMap[reply.user_id];
        const isCurrentUser = reply.user_id === currentUserId;
        return {
          ...reply,
          user: {
            id: reply.user_id,
            user_metadata: {
              full_name: isCurrentUser && meta ? (meta.full_name ?? meta.name ?? profile?.full_name) : profile?.full_name,
              avatar_url: isCurrentUser && meta ? (meta.avatar_url ?? meta.picture ?? profile?.avatar_url) : profile?.avatar_url,
            },
          },
          likes_count: likesMap[reply.id] ?? 0,
          is_liked: userLikes.includes(reply.id),
        };
      });

      setReplies(enrichedReplies);
    } catch (err) {
      console.error('Error fetching replies:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [post.id, currentUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handlePostLike = async () => {
    if (!currentUserId) {
      navigation.dispatch(CommonActions.navigate({ name: 'GetStarted' }));
      return;
    }
    triggerSelection();

    const isLiked = post.is_liked ?? false;
    setPost((prev) => ({
      ...prev,
      is_liked: !isLiked,
      likes_count: (prev.likes_count ?? 0) + (isLiked ? -1 : 1),
    }));

    try {
      if (isLiked) {
        await supabase
          .from('community_post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId);
      } else {
        await supabase
          .from('community_post_likes')
          .insert({ post_id: post.id, user_id: currentUserId });
      }
    } catch (err) {
      setPost((prev) => ({
        ...prev,
        is_liked: isLiked,
        likes_count: (prev.likes_count ?? 0) + (isLiked ? 1 : -1),
      }));
    }
  };

  const handleReplyLike = async (replyId: number, isLiked: boolean) => {
    if (!currentUserId) {
      navigation.dispatch(CommonActions.navigate({ name: 'GetStarted' }));
      return;
    }

    setReplies((prev) =>
      prev.map((r) =>
        r.id === replyId
          ? {
              ...r,
              is_liked: !isLiked,
              likes_count: (r.likes_count ?? 0) + (isLiked ? -1 : 1),
            }
          : r
      )
    );

    try {
      if (isLiked) {
        await supabase
          .from('community_reply_likes')
          .delete()
          .eq('reply_id', replyId)
          .eq('user_id', currentUserId);
      } else {
        await supabase
          .from('community_reply_likes')
          .insert({ reply_id: replyId, user_id: currentUserId });
      }
    } catch (err) {
      setReplies((prev) =>
        prev.map((r) =>
          r.id === replyId
            ? {
                ...r,
                is_liked: isLiked,
                likes_count: (r.likes_count ?? 0) + (isLiked ? 1 : -1),
              }
            : r
        )
      );
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !currentUserId || sending) return;

    setSending(true);
    triggerImpact();

    try {
      const { data, error } = await supabase
        .from('community_replies')
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          content: replyText.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      const meta = session?.user?.user_metadata;
      const newReply: CommunityReply = {
        ...data,
        user: {
          id: currentUserId,
          user_metadata: {
            full_name: meta?.full_name ?? meta?.name ?? undefined,
            avatar_url: meta?.avatar_url ?? meta?.picture ?? undefined,
          },
        },
        likes_count: 0,
        is_liked: false,
      };

      setReplies((prev) => [...prev, newReply]);
      setReplyText('');
      setPost((prev) => ({
        ...prev,
        replies_count: (prev.replies_count ?? 0) + 1,
      }));

      if (meta) {
        await supabase.from('profiles').upsert(
          {
            id: currentUserId,
            full_name: meta.full_name ?? meta.name ?? null,
            avatar_url: meta.avatar_url ?? meta.picture ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setSending(false);
    }
  };

  const avatarUrl = getAvatarUrl(post.user);
  const currentUserAvatar = session?.user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.picture;
  const isLiked = post.is_liked ?? false;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background.bgBaseElevated }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.background.bgAlt }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            triggerSelection();
            navigation.goBack();
          }}
        >
          <ChevronLeft size={28} color={colors.text.textBase} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.textBase }]}>Post</Text>
        {isOwnPost ? (
          <TouchableOpacity
            style={styles.headerRightBtn}
            onPress={() => {
              triggerSelection();
              postOptionsSheetRef.current?.present();
            }}
            hitSlop={8}
          >
            <MoreVertical size={24} color={colors.text.textBase} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text.textBase} />
        }
      >
        {/* Main Post */}
        <View style={[styles.postCard, { backgroundColor: colors.surface.onBgBase }]}>
          <View style={styles.postHeader}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.border.border3 }]} />
            )}
            <View style={styles.postMeta}>
              <Text style={[styles.postName, { color: colors.text.textBase }]}>{postAuthorName}</Text>
              <Text style={[styles.postDate, { color: colors.text.textTertiary }]}>{formatPostDate(post.created_at)} {formatPostTime(post.created_at)}</Text>
            </View>
          </View>
          <Text style={[styles.postText, { color: colors.text.textBase }]}>{post.content}</Text>
          {post.image_urls && post.image_urls.length > 0 && (
            <View style={styles.postImages}>
              {post.image_urls.map((url, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    triggerSelection();
                    setImageViewerUrls(post.image_urls ?? []);
                    setImageViewerIndex(idx);
                    setImageViewerVisible(true);
                  }}
                  style={({ pressed }) => [styles.postImageTouchable, pressed && { opacity: 0.85 }]}
                >
                  <Image source={{ uri: url }} style={[styles.postImage, { backgroundColor: colors.background.bgBaseElevated }]} />
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.postActions}>
            <TouchableOpacity style={styles.actionRow} onPress={handlePostLike}>
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
          </View>
        </View>

        {/* Replies Section */}
        <Text style={[styles.repliesTitle, { color: colors.text.textBase }]}>Replies</Text>

        {loading ? (
          <ActivityIndicator size="small" color={colors.text.textBase} style={{ marginTop: 20 }} />
        ) : replies.length === 0 ? (
          <Text style={[styles.noReplies, { color: colors.text.textTertiary }]}>No replies yet. Be the first to reply!</Text>
        ) : (
          replies.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              postAuthorName={postAuthorName}
              onLike={handleReplyLike}
              currentUserId={currentUserId}
              colors={colors}
            />
          ))
        )}
      </ScrollView>

      {/* Reply Input - only show when logged in */}
      {currentUserId && (
        <View style={[styles.replyInputContainer, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background.bgAlt, borderTopColor: colors.border.border2 }]}>
          {currentUserAvatar ? (
            <Image source={{ uri: currentUserAvatar }} style={styles.inputAvatar} />
          ) : (
            <View style={[styles.inputAvatar, styles.avatarPlaceholder, { backgroundColor: colors.border.border3 }]} />
          )}
          <View style={styles.inputWrapper}>
            <View style={[styles.inputIndicator, { backgroundColor: colors.text.textBrand }]} />
            <TextInput
              style={[styles.replyInput, { color: colors.text.textBase }]}
              placeholder="Write your reply!"
              placeholderTextColor={colors.text.textTertiary}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: colors.border.border3 },
              replyText.trim() && { backgroundColor: colors.background.bgInverse },
            ]}
            onPress={handleSendReply}
            disabled={!replyText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.text.textInverse} />
            ) : (
              <Send size={20} color={replyText.trim() ? colors.text.textInverse : colors.text.textTertiary} />
            )}
          </TouchableOpacity>
        </View>
      )}

      <ImageViewer
        visible={imageViewerVisible}
        imageUrls={imageViewerUrls}
        initialIndex={imageViewerIndex}
        onClose={() => setImageViewerVisible(false)}
      />

      <BottomSheetModal
        ref={postOptionsSheetRef}
        enableDynamicSizing
        maxDynamicContentSize={maxOptionsSheetHeight}
        enablePanDownToClose
        backdropComponent={renderPostOptionsBackdrop}
        backgroundStyle={{ backgroundColor: colors.background.bgAlt }}
        handleIndicatorStyle={{ backgroundColor: colors.border.border4 }}
      >
        <BottomSheetView style={[styles.optionsSheetContent, { paddingBottom: insets.bottom + 24 }]}>
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
    </KeyboardAvoidingView>
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
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRightBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
  },
  postCard: {
    borderRadius: 16,
    padding: 16,
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
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  postImageTouchable: {},
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
  repliesTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 16,
  },
  noReplies: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  replyCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  replyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  replyMeta: {
    marginLeft: 12,
  },
  replyName: {
    fontSize: 15,
    fontWeight: '600',
  },
  replyingTo: {
    fontSize: 13,
    marginTop: 1,
  },
  replyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  replyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  replyDate: {
    fontSize: 13,
  },
  replyLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyLikeCount: {
    fontSize: 13,
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  inputIndicator: {
    width: 2,
    height: 24,
    borderRadius: 2,
    marginRight: 8,
  },
  replyInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
