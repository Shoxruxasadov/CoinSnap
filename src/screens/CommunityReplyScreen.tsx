import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainStack';
import { supabase } from '../lib/supabase';
import { useSupabaseSession } from '../lib/useSupabaseSession';
import { CommunityPost, getDisplayName, getAvatarUrl } from '../types/community';
import { triggerSelection, triggerImpact } from '../lib/haptics';
import { useThemeColors } from '../theme/useThemeColors';

type StackNav = NativeStackNavigationProp<MainStackParamList>;
type RouteType = RouteProp<MainStackParamList, 'CommunityReply'>;

export default function CommunityReplyScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation<StackNav>();
  const route = useRoute<RouteType>();
  const { session } = useSupabaseSession();
  const currentUserId = session?.user?.id;
  const userAvatar =
    session?.user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.picture;

  const post = route.params.post;
  const postAuthorName = getDisplayName(post.user);
  const postAuthorAvatar = getAvatarUrl(post.user);

  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = content.trim().length > 0;

  const handleClose = () => {
    triggerSelection();
    navigation.goBack();
  };

  const handleSend = async () => {
    if (!canSend || !currentUserId || sending) return;

    setSending(true);
    triggerImpact();

    try {
      const { error } = await supabase.from('community_replies').insert({
        post_id: post.id,
        user_id: currentUserId,
        content: content.trim(),
      });

      if (error) throw error;

      navigation.goBack();
    } catch (err) {
      console.error('Error creating reply:', err);
      Alert.alert('Error', 'Failed to send reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background.bgAlt }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
          <X size={24} color={colors.text.textBase} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: colors.border.border3 },
            canSend && { backgroundColor: colors.background.bgInverse },
          ]}
          onPress={handleSend}
          disabled={!canSend || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.text.textWhite} />
          ) : (
            <Send size={20} color={canSend ? colors.text.textWhite : colors.text.textTertiary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Original Post Preview */}
        <View style={[styles.originalPost, { borderBottomColor: colors.border.border2 }]}>
          {postAuthorAvatar ? (
            <Image source={{ uri: postAuthorAvatar }} style={styles.originalAvatar} />
          ) : (
            <View style={[styles.originalAvatar, styles.avatarPlaceholder, { backgroundColor: colors.border.border3 }]} />
          )}
          <View style={styles.originalTextWrap}>
            <Text style={[styles.originalName, { color: colors.text.textBase }]}>{postAuthorName}</Text>
            <Text style={[styles.originalContent, { color: colors.text.textBaseTint }]} numberOfLines={4}>
              {post.content}
            </Text>
          </View>
        </View>

        {/* Reply Input */}
        <View style={styles.replyRow}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.border.border3 }]} />
          )}
          <View style={styles.inputWrapper}>
            <View style={[styles.inputIndicator, { backgroundColor: colors.text.textBrand }]} />
            <TextInput
              style={[styles.textInput, { color: colors.text.textBase }]}
              placeholder="Write your reply!"
              placeholderTextColor={colors.text.textTertiary}
              value={content}
              onChangeText={setContent}
              multiline
              autoFocus
              maxLength={500}
            />
          </View>
        </View>
      </View>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  originalPost: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 20,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  originalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  originalTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  originalName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  originalContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {},
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: 12,
  },
  inputIndicator: {
    width: 3,
    borderRadius: 2,
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
