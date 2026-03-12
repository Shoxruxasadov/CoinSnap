import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Send, ImagePlus ,ChevronLeft} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import type { MainStackParamList } from '../navigation/MainStack';
import { supabase } from '../lib/supabase';
import { useSupabaseSession } from '../lib/useSupabaseSession';
import Toast from 'react-native-toast-message';
import { triggerSelection, triggerImpact } from '../lib/haptics';
import { useThemeColors } from '../theme/useThemeColors';

type StackNav = NativeStackNavigationProp<MainStackParamList>;
type NewPostRoute = RouteProp<MainStackParamList, 'CommunityNewPost'>;

export default function CommunityNewPostScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation<StackNav>();
  const route = useRoute<NewPostRoute>();
  const editPost = route.params?.post;
  const { session } = useSupabaseSession();
  const currentUserId = session?.user?.id;
  const userAvatar =
    session?.user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.picture;

  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (editPost) {
      setContent(editPost.content || '');
      setImages(editPost.image_urls || []);
    }
  }, [editPost?.id]);

  const canSend = content.trim().length > 0;

  const handleClose = () => {
    triggerSelection();
    navigation.goBack();
  };

  const MAX_IMAGES = 9;

  const handlePickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit', `You can attach up to ${MAX_IMAGES} images`);
      return;
    }

    triggerSelection();

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleRemoveImage = (index: number) => {
    triggerSelection();
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
      const filename = `${currentUserId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('community-images')
        .upload(filename, decode(base64), {
          contentType,
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      const { data: publicUrl } = supabase.storage
        .from('community-images')
        .getPublicUrl(data.path);

      return publicUrl.publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  };

  const handleSend = async () => {
    if (!canSend || !currentUserId || sending) return;

    setSending(true);
    triggerImpact();

    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        const results = await Promise.all(
          images.map((uri) =>
            uri.startsWith('http') ? Promise.resolve(uri) : uploadImage(uri)
          )
        );
        imageUrls = results.filter((url): url is string => url !== null && url !== undefined);
      }

      if (editPost?.id) {
        const { error } = await supabase
          .from('community_posts')
          .update({ content: content.trim(), image_urls: imageUrls, updated_at: new Date().toISOString() })
          .eq('id', editPost.id)
          .eq('user_id', currentUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('community_posts').insert({
          user_id: currentUserId,
          content: content.trim(),
          image_urls: imageUrls,
        });
        if (error) throw error;
      }

      const meta = session?.user?.user_metadata;
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

      Toast.show({
        type: 'success',
        text1: editPost ? 'Post updated' : 'Your post successfully uploaded',
      });
      navigation.goBack();
    } catch (err) {
      console.error(editPost ? 'Error updating post:' : 'Error creating post:', err);
      Alert.alert('Error', editPost ? 'Failed to update post.' : 'Failed to create post. Please try again.');
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
        <ChevronLeft size={28} color={colors.text.textBase} />
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
            <ActivityIndicator size="small" color={colors.text.textInverse} />
          ) : (
            <Send size={20} color={canSend ? colors.text.textInverse : colors.text.textTertiary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputRow}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.border.border3 }]} />
          )}
          <View style={styles.inputWrapper}>
            <View style={[styles.inputIndicator, { backgroundColor: colors.text.textBrand }]} />
            <TextInput
              style={[styles.textInput, { color: colors.text.textBase }]}
              placeholder="Write your post!"
              placeholderTextColor={colors.text.textTertiary}
              value={content}
              onChangeText={setContent}
              multiline
              autoFocus
              maxLength={1000}
            />
          </View>
        </View>

        {images.length === 0 ? (
          <View style={styles.imageRow}>
            <TouchableOpacity style={[styles.addImageBtn, { borderColor: colors.border.border3 }]} onPress={handlePickImage}>
              <ImagePlus size={28} color={colors.text.textTertiary} />
              <Text style={[styles.addImageText, { color: colors.text.textBaseTint }]}>Attach image</Text>
              <Text style={[styles.addImageSubtext, { color: colors.text.textTertiary }]}>Tap to upload</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.imageScrollRow}
            contentContainerStyle={styles.imageScrollContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {images.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={[styles.imagePreview, { backgroundColor: colors.background.bgBaseElevated }]} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => handleRemoveImage(index)}
                >
                  <X size={16} color={colors.text.textWhite} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < MAX_IMAGES && (
              <TouchableOpacity style={[styles.addImageBtn, { borderColor: colors.border.border3 }]} onPress={handlePickImage}>
                <ImagePlus size={28} color={colors.text.textTertiary} />
                <Text style={[styles.addImageText, { color: colors.text.textBaseTint }]}>Attach image</Text>
                <Text style={[styles.addImageSubtext, { color: colors.text.textTertiary }]}>Tap to upload</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
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
    width: 2,
    borderRadius: 2,
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 44,
    paddingBottom: 12,
    paddingTop: 6,
    textAlignVertical: 'top',
  },
  imageRow: {
    flexDirection: 'row',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  imageScrollRow: {
    marginTop: 24,
    maxHeight: 172,
    paddingHorizontal: 20,
  },
  imageScrollContent: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 20,
  },
  imageContainer: {
    position: 'relative',
    width: 160,
    height: 160,
    borderRadius: 16,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageBtn: {
    width: 160,
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  addImageSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
});
